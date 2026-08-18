import { afterEach, describe, expect, it, vi } from 'vitest';

import { processFiles } from '../src';

class WorkerMock {
    onmessage: ((event: MessageEvent) => void) | null = null;
    onerror: ((event: ErrorEvent) => void) | null = null;

    postMessage(): void {
        this.onmessage?.({
            data: {
                type: 'result',
                buffer: new ArrayBuffer(2),
                originalWidth: 200,
                originalHeight: 100,
                outputWidth: 200,
                outputHeight: 100,
                decodeMs: 10,
                resizeMs: 0,
                encodeMs: 20,
                finalQuality: 80,
                encodeAttempts: 1,
            },
        } as MessageEvent);
    }

    terminate(): void {}
}

describe('processFiles', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('preserves order and passes unsupported files through unchanged', async () => {
        vi.stubGlobal('Worker', WorkerMock);

        const jpeg = new File(
            [new Uint8Array(4)],
            'photo.jpg',
            {
                type: 'image/jpeg',
            },
        );

        const pdf = new File(
            [new Uint8Array(3)],
            'contract.pdf',
            {
                type: 'application/pdf',
            },
        );

        const webp = new File(
            [new Uint8Array(2)],
            'floorplan.webp',
            {
                type: 'image/webp',
            },
        );

        const text = new File(
            [new Uint8Array(1)],
            'notes.txt',
            {
                type: 'text/plain',
            },
        );

        const input = [jpeg, pdf, webp, text];

        const result = await processFiles(input);

        expect(result.files).toHaveLength(4);

        expect(result.files[0]).not.toBe(jpeg);
        expect(result.files[1]).toBe(pdf);
        expect(result.files[2]).toBe(webp);
        expect(result.files[3]).toBe(text);

        expect(result.items.map((item) => item.index)).toEqual([
            0,
            1,
            2,
            3,
        ]);

        expect(result.items.map((item) => item.outcome)).toEqual([
            'optimized',
            'unchanged',
            'unchanged',
            'unchanged',
        ]);

        expect(result.items[1]?.reason).toBe('non-image');
        expect(result.items[2]?.reason).toBe(
            'unsupported-image-format',
        );
        expect(result.items[3]?.reason).toBe('non-image');

        expect(result.summary).toEqual({
            totalFiles: 4,
            imageFiles: 2,
            optimizedFiles: 1,
            unchangedFiles: 3,
            failedOptimizations: 0,
            originalBytes: 10,
            outputBytes: 8,
            savedBytes: 2,
            savedPercent: 20,
        });
    });

    it('does not mutate the input array', async () => {
        vi.stubGlobal('Worker', WorkerMock);

        const jpeg = new File(
            [new Uint8Array(4)],
            'photo.jpg',
            {
                type: 'image/jpeg',
            },
        );

        const pdf = new File(
            [new Uint8Array(3)],
            'contract.pdf',
            {
                type: 'application/pdf',
            },
        );

        const input = [jpeg, pdf];
        const originalInput = [...input];

        await processFiles(input);

        expect(input).toEqual(originalInput);
        expect(input[0]).toBe(jpeg);
        expect(input[1]).toBe(pdf);
    });

    it('passes the original image through when optimization fails', async () => {
        vi.stubGlobal(
            'Worker',
            class {
                onmessage: ((event: MessageEvent) => void) | null = null;
                onerror: ((event: ErrorEvent) => void) | null = null;

                postMessage(): void {
                    this.onerror?.({
                        message: 'Worker failed',
                    } as ErrorEvent);
                }

                terminate(): void {}
            },
        );

        const jpeg = new File(
            [new Uint8Array(4)],
            'photo.jpg',
            {
                type: 'image/jpeg',
            },
        );

        const result = await processFiles([jpeg]);

        expect(result.files[0]).toBe(jpeg);

        expect(result.items[0]).toMatchObject({
            index: 0,
            originalFile: jpeg,
            file: jpeg,
            kind: 'image',
            outcome: 'failed-passthrough',
            reason: 'optimization-failed',
        });

        expect(result.items[0]?.error).toMatchObject({
            code: 'worker-failed',
        });

        expect(result.summary.failedOptimizations).toBe(1);
    });

    it('rejects the batch when errorMode is throw', async () => {
        vi.stubGlobal(
            'Worker',
            class {
                onmessage: ((event: MessageEvent) => void) | null = null;
                onerror: ((event: ErrorEvent) => void) | null = null;

                postMessage(): void {
                    this.onerror?.({
                        message: 'Worker failed',
                    } as ErrorEvent);
                }

                terminate(): void {}
            },
        );

        const jpeg = new File(
            [new Uint8Array(4)],
            'photo.jpg',
            {
                type: 'image/jpeg',
            },
        );

        await expect(
            processFiles([jpeg], {
                errorMode: 'throw',
            }),
        ).rejects.toMatchObject({
            code: 'worker-failed',
        });
    });

    it.each([
        0,
        -1,
        1.5,
        Number.NaN,
        Number.POSITIVE_INFINITY,
    ])('rejects invalid concurrency value %s', async (concurrency) => {
        await expect(
            processFiles([], {
                concurrency,
            }),
        ).rejects.toMatchObject({
            code: 'invalid-options',
        });
    });

    it('limits concurrent image processing while preserving file order', async () => {
        let activeWorkers = 0;
        let maxActiveWorkers = 0;

        vi.stubGlobal(
            'Worker',
            class {
                onmessage: ((event: MessageEvent) => void) | null = null;
                onerror: ((event: ErrorEvent) => void) | null = null;

                postMessage(): void {
                    activeWorkers += 1;
                    maxActiveWorkers = Math.max(
                        maxActiveWorkers,
                        activeWorkers,
                    );

                    setTimeout(() => {
                        activeWorkers -= 1;

                        this.onmessage?.({
                            data: {
                                type: 'result',
                                buffer: new ArrayBuffer(1),
                                originalWidth: 100,
                                originalHeight: 100,
                                outputWidth: 100,
                                outputHeight: 100,
                                decodeMs: 10,
                                resizeMs: 0,
                                encodeMs: 20,
                                finalQuality: 80,
                                encodeAttempts: 1,
                            },
                        } as MessageEvent);
                    }, 10);
                }

                terminate(): void {}
            },
        );

        const firstImage = new File(
            [new Uint8Array(4)],
            'first.jpg',
            {
                type: 'image/jpeg',
            },
        );

        const pdf = new File(
            [new Uint8Array(3)],
            'document.pdf',
            {
                type: 'application/pdf',
            },
        );

        const secondImage = new File(
            [new Uint8Array(4)],
            'second.jpg',
            {
                type: 'image/jpeg',
            },
        );

        const thirdImage = new File(
            [new Uint8Array(4)],
            'third.jpg',
            {
                type: 'image/jpeg',
            },
        );

        const result = await processFiles(
            [
                firstImage,
                pdf,
                secondImage,
                thirdImage,
            ],
            {
                concurrency: 2,
            },
        );

        expect(maxActiveWorkers).toBe(2);

        expect(result.files).toHaveLength(4);
        expect(result.files[1]).toBe(pdf);

        expect(result.items.map((item) => item.index)).toEqual([
            0,
            1,
            2,
            3,
        ]);
    });

    it('aborts the entire batch and terminates active workers', async () => {
        let createdWorkers = 0;
        const terminate = vi.fn();

        let resolveWorkersStarted!: () => void;

        const workersStarted = new Promise<void>((resolve) => {
            resolveWorkersStarted = resolve;
        });

        vi.stubGlobal(
            'Worker',
            class {
                onmessage: ((event: MessageEvent) => void) | null = null;
                onerror: ((event: ErrorEvent) => void) | null = null;

                constructor() {
                    createdWorkers += 1;

                    if (createdWorkers === 2) {
                        resolveWorkersStarted();
                    }
                }

                postMessage(): void {}

                terminate(): void {
                    terminate();
                }
            },
        );

        const files = [
            new File([new Uint8Array(4)], 'first.jpg', {
                type: 'image/jpeg',
            }),
            new File([new Uint8Array(4)], 'second.jpg', {
                type: 'image/jpeg',
            }),
            new File([new Uint8Array(4)], 'third.jpg', {
                type: 'image/jpeg',
            }),
        ];

        const controller = new AbortController();

        const promise = processFiles(files, {
            concurrency: 2,
            signal: controller.signal,
        });

        await workersStarted;

        controller.abort();

        await expect(promise).rejects.toMatchObject({
            code: 'aborted',
        });

        expect(createdWorkers).toBe(2);
        expect(terminate).toHaveBeenCalledTimes(2);
    });

    it('treats content-level unsupported images as unchanged', async () => {
        vi.stubGlobal(
            'Worker',
            class {
                onmessage: ((event: MessageEvent) => void) | null = null;
                onerror: ((event: ErrorEvent) => void) | null = null;

                postMessage(): void {
                    this.onmessage?.({
                        data: {
                            type: 'error',
                            code: 'unsupported-format',
                            message: 'Animated PNG images are not supported.',
                        },
                    } as MessageEvent);
                }

                terminate(): void {}
            },
        );

        const png = new File(
            [new Uint8Array(4)],
            'animated.png',
            {
                type: 'image/png',
            },
        );

        const result = await processFiles([png]);

        expect(result.files[0]).toBe(png);

        expect(result.items[0]).toMatchObject({
            kind: 'image',
            outcome: 'unchanged',
            reason: 'unsupported-image-format',
        });

        expect(result.summary.failedOptimizations).toBe(0);
    });
});