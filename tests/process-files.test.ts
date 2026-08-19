import { afterEach, describe, expect, it, vi } from 'vitest';

import { processFiles } from '../src';
import { createTestImageFile } from './test-image-files';

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

    function createHeicTestFile(
        name: string,
    ): File {
        const bytes = new Uint8Array(24);
        const view = new DataView(
            bytes.buffer,
        );

        view.setUint32(0, 24);

        bytes.set(
            [
                0x66,
                0x74,
                0x79,
                0x70,
            ],
            4,
        );

        bytes.set(
            [
                0x6d,
                0x69,
                0x66,
                0x31,
            ],
            8,
        );

        bytes.set(
            [
                0x68,
                0x65,
                0x69,
                0x63,
            ],
            16,
        );

        return new File(
            [bytes],
            name,
        );
    }

    it('preserves order and passes unsupported files through unchanged', async () => {
        vi.stubGlobal('Worker', WorkerMock);

        const jpeg = createTestImageFile(
            'jpeg',
            {
                name: 'photo.jpg',
            },
        );

        const pdf = new File(
            [new Uint8Array(3)],
            'contract.pdf',
            {
                type: 'application/pdf',
            },
        );

        const heic = new File(
            [new Uint8Array(2)],
            'floorplan.heic',
            {
                type: 'image/heic',
            },
        );

        const text = new File(
            [new Uint8Array(1)],
            'notes.txt',
            {
                type: 'text/plain',
            },
        );

        const input = [jpeg, pdf, heic, text];

        const result = await processFiles(input);

        expect(result.files).toHaveLength(4);

        expect(result.files[0]).not.toBe(jpeg);
        expect(result.files[1]).toBe(pdf);
        expect(result.files[2]).toBe(heic);
        expect(result.files[3]).toBe(text);

        expect(
            result.items.map((item) => item.index),
        ).toEqual([
            0,
            1,
            2,
            3,
        ]);

        expect(
            result.items.map((item) => item.outcome),
        ).toEqual([
            'optimized',
            'unchanged',
            'unchanged',
            'unchanged',
        ]);

        expect(result.items[1]?.reason).toBe(
            'non-image',
        );

        expect(result.items[2]?.reason).toBe(
            'unsupported-image-format',
        );

        expect(result.items[3]?.reason).toBe(
            'non-image',
        );

        expect(result.summary).toEqual({
            totalFiles: 4,
            imageFiles: 2,
            optimizedFiles: 1,
            changedFiles: 0,
            unchangedFiles: 3,
            failedOptimizations: 0,
            originalBytes: 10,
            outputBytes: 8,
            savings: {
                bytes: 2,
                ratio: 0.2,
                percent: 20,
            },
            sizeChange: {
                bytes: -2,
                ratio: -0.2,
                percent: -20,
            },
        });
    });

    it('does not mutate the input array', async () => {
        vi.stubGlobal('Worker', WorkerMock);

        const jpeg = createTestImageFile(
            'jpeg',
            {
                name: 'photo.jpg',
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
                onmessage:
                    | ((event: MessageEvent) => void)
                    | null = null;

                onerror:
                    | ((event: ErrorEvent) => void)
                    | null = null;

                postMessage(): void {
                    this.onerror?.({
                        message: 'Worker failed',
                    } as ErrorEvent);
                }

                terminate(): void {}
            },
        );

        const jpeg = createTestImageFile(
            'jpeg',
            {
                name: 'photo.jpg',
            },
        );

        const result = await processFiles([
            jpeg,
        ]);

        expect(result.files[0]).toBe(jpeg);

        expect(result.items[0]).toMatchObject({
            index: 0,
            originalFile: jpeg,
            file: jpeg,
            kind: 'image',
            outcome: 'failed-passthrough',
            reason: 'optimization-failed',
        });

        expect(
            result.items[0]?.error,
        ).toMatchObject({
            code: 'worker-failed',
        });

        expect(
            result.summary.failedOptimizations,
        ).toBe(1);
    });

    it('rejects the batch when errorMode is throw', async () => {
        vi.stubGlobal(
            'Worker',
            class {
                onmessage:
                    | ((event: MessageEvent) => void)
                    | null = null;

                onerror:
                    | ((event: ErrorEvent) => void)
                    | null = null;

                postMessage(): void {
                    this.onerror?.({
                        message: 'Worker failed',
                    } as ErrorEvent);
                }

                terminate(): void {}
            },
        );

        const jpeg = createTestImageFile(
            'jpeg',
            {
                name: 'photo.jpg',
            },
        );

        await expect(
            processFiles(
                [jpeg],
                {
                    errorMode: 'throw',
                },
            ),
        ).rejects.toMatchObject({
            code: 'worker-failed',
        });
    });

    it.each([
        0,
        -1,
        1.5,
        5,
        100,
        Number.NaN,
        Number.POSITIVE_INFINITY,
    ])(
        'rejects invalid concurrency value %s',
        async (concurrency) => {
            await expect(
                processFiles([], {
                    concurrency,
                }),
            ).rejects.toMatchObject({
                code: 'invalid-options',
            });
        },
    );

    it('limits concurrent image processing while preserving file order', async () => {
        let activeWorkers = 0;
        let maxActiveWorkers = 0;

        vi.stubGlobal(
            'Worker',
            class {
                onmessage:
                    | ((event: MessageEvent) => void)
                    | null = null;

                onerror:
                    | ((event: ErrorEvent) => void)
                    | null = null;

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
                                buffer:
                                    new ArrayBuffer(
                                        1,
                                    ),
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

        const firstImage =
            createTestImageFile(
                'jpeg',
                {
                    name: 'first.jpg',
                },
            );

        const pdf = new File(
            [new Uint8Array(3)],
            'document.pdf',
            {
                type: 'application/pdf',
            },
        );

        const secondImage =
            createTestImageFile(
                'jpeg',
                {
                    name: 'second.jpg',
                },
            );

        const thirdImage =
            createTestImageFile(
                'jpeg',
                {
                    name: 'third.jpg',
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

        expect(
            result.items.map((item) => item.index),
        ).toEqual([
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

        const workersStarted =
            new Promise<void>((resolve) => {
                resolveWorkersStarted = resolve;
            });

        vi.stubGlobal(
            'Worker',
            class {
                onmessage:
                    | ((event: MessageEvent) => void)
                    | null = null;

                onerror:
                    | ((event: ErrorEvent) => void)
                    | null = null;

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
            createTestImageFile(
                'jpeg',
                {
                    name: 'first.jpg',
                },
            ),
            createTestImageFile(
                'jpeg',
                {
                    name: 'second.jpg',
                },
            ),
            createTestImageFile(
                'jpeg',
                {
                    name: 'third.jpg',
                },
            ),
        ];

        const controller =
            new AbortController();

        const promise = processFiles(
            files,
            {
                concurrency: 2,
                signal: controller.signal,
            },
        );

        await workersStarted;

        controller.abort();

        await expect(
            promise,
        ).rejects.toMatchObject({
            code: 'aborted',
        });

        expect(createdWorkers).toBe(2);

        expect(
            terminate,
        ).toHaveBeenCalledTimes(2);
    });

    it('treats content-level unsupported images as unchanged', async () => {
        vi.stubGlobal(
            'Worker',
            class {
                onmessage:
                    | ((event: MessageEvent) => void)
                    | null = null;

                onerror:
                    | ((event: ErrorEvent) => void)
                    | null = null;

                postMessage(): void {
                    this.onmessage?.({
                        data: {
                            type: 'error',
                            code: 'unsupported-format',
                            message:
                                'Animated PNG images are not supported.',
                        },
                    } as MessageEvent);
                }

                terminate(): void {}
            },
        );

        const png = createTestImageFile(
            'png',
            {
                name: 'animated.png',
            },
        );

        const result = await processFiles([
            png,
        ]);

        expect(result.files[0]).toBe(png);

        expect(result.items[0]).toMatchObject({
            kind: 'image',
            outcome: 'unchanged',
            reason: 'unsupported-image-format',
        });

        expect(
            result.summary.failedOptimizations,
        ).toBe(0);
    });

    it('passes an image through unchanged when its codec is not supported', async () => {
        vi.stubGlobal(
            'Worker',
            class {
                onmessage:
                    | ((event: MessageEvent) => void)
                    | null = null;

                onerror:
                    | ((event: ErrorEvent) => void)
                    | null = null;

                postMessage(): void {
                    this.onmessage?.({
                        data: {
                            type: 'error',
                            code: 'codec-not-supported',
                            message:
                                'The required image codec is not supported.',
                        },
                    } as MessageEvent);
                }

                terminate(): void {}
            },
        );

        const image =
            createTestImageFile(
                'jpeg',
                {
                    name: 'photo.jpg',
                },
            );

        const result = await processFiles([
            image,
        ]);

        expect(result.files[0]).toBe(image);

        expect(result.items[0]).toMatchObject({
            index: 0,
            originalFile: image,
            file: image,
            kind: 'image',
            outcome: 'unchanged',
            reason: 'codec-not-supported',
        });

        expect(result.summary).toMatchObject({
            totalFiles: 1,
            imageFiles: 1,
            optimizedFiles: 0,
            unchangedFiles: 1,
            failedOptimizations: 0,
        });
    });

    it('passes a transparent image through unchanged when JPEG output is requested', async () => {
        vi.stubGlobal(
            'Worker',
            class {
                onmessage:
                    | ((event: MessageEvent) => void)
                    | null = null;

                onerror:
                    | ((event: ErrorEvent) => void)
                    | null = null;

                postMessage(): void {
                    this.onmessage?.({
                        data: {
                            type: 'error',
                            code: 'transparency-not-supported',
                            message:
                                'JPEG output cannot preserve image transparency.',
                        },
                    } as MessageEvent);
                }

                terminate(): void {}
            },
        );

        const png = createTestImageFile(
            'png',
            {
                name: 'logo.png',
            },
        );

        const result = await processFiles(
            [png],
            {
                mode: 'format',
                format: 'jpeg',
            },
        );

        expect(result.files[0]).toBe(png);

        expect(result.items[0]).toMatchObject({
            kind: 'image',
            outcome: 'unchanged',
            reason:
                'transparency-not-supported',
        });

        expect(
            result.summary.failedOptimizations,
        ).toBe(0);
    });

    it('passes an image through unchanged when the resource limit is exceeded', async () => {
        vi.stubGlobal(
            'Worker',
            class {
                onmessage:
                    | ((event: MessageEvent) => void)
                    | null = null;

                onerror:
                    | ((event: ErrorEvent) => void)
                    | null = null;

                postMessage(): void {
                    this.onmessage?.({
                        data: {
                            type: 'error',
                            code:
                                'resource-limit-exceeded',
                            message:
                                'Decoded image exceeds the configured pixel limit.',
                        },
                    } as MessageEvent);
                }

                terminate(): void {}
            },
        );

        const file =
            createTestImageFile(
                'jpeg',
                {
                    name: 'large.jpg',
                },
            );

        const result = await processFiles(
            [file],
            {
                limits: {
                    maxPixels: 1_000_000,
                },
            },
        );

        expect(result.files[0]).toBe(file);

        expect(result.items[0]).toMatchObject({
            kind: 'image',
            outcome: 'unchanged',
            reason:
                'resource-limit-exceeded',
        });

        expect(result.summary).toMatchObject({
            totalFiles: 1,
            imageFiles: 1,
            optimizedFiles: 0,
            changedFiles: 0,
            unchangedFiles: 1,
            failedOptimizations: 0,
            originalBytes: 4,
            outputBytes: 4,
        });

        expect(result.summary.savings).toEqual({
            bytes: 0,
            ratio: 0,
            percent: 0,
        });

        expect(
            result.summary.sizeChange,
        ).toEqual({
            bytes: 0,
            ratio: 0,
            percent: 0,
        });
    });

    it('processes JPEG, WebP, and HEIC from their signatures when MIME types are empty', async () => {
        const postedFormats: Array<{
            inputFormat: string;
            outputFormat: string;
        }> = [];

        vi.stubGlobal(
            'Worker',
            class {
                onmessage:
                    | ((event: MessageEvent) => void)
                    | null = null;

                onerror:
                    | ((event: ErrorEvent) => void)
                    | null = null;

                postMessage(message: unknown): void {
                    const data = message as {
                        inputFormat: string;
                        outputFormat: string;
                    };

                    postedFormats.push({
                        inputFormat: data.inputFormat,
                        outputFormat: data.outputFormat,
                    });

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
            },
        );

        const jpeg = createTestImageFile(
            'jpeg',
            {
                name: 'jpeg-file',
                type: '',
            },
        );

        const webp = createTestImageFile(
            'webp',
            {
                name: 'webp-file',
                type: '',
            },
        );

        const heic = createHeicTestFile(
            'heic-file',
        );

        const result = await processFiles(
            [
                jpeg,
                webp,
                heic,
            ],
            {
                mode: 'auto',
            },
        );

        expect(postedFormats).toEqual([
            {
                inputFormat: 'jpeg',
                outputFormat: 'webp',
            },
            {
                inputFormat: 'webp',
                outputFormat: 'webp',
            },
            {
                inputFormat: 'heic',
                outputFormat: 'webp',
            },
        ]);

        expect(
            result.items.map(
                (item) => item.outcome,
            ),
        ).toEqual([
            'optimized',
            'optimized',
            'optimized',
        ]);

        expect(
            result.files.map(
                (file) => file.name,
            ),
        ).toEqual([
            'jpeg-file.webp',
            'webp-file.webp',
            'heic-file.webp',
        ]);

        expect(
            result.files.map(
                (file) => file.type,
            ),
        ).toEqual([
            'image/webp',
            'image/webp',
            'image/webp',
        ]);

        expect(result.summary).toMatchObject({
            totalFiles: 3,
            imageFiles: 3,
            optimizedFiles: 3,
            changedFiles: 0,
            unchangedFiles: 0,
            failedOptimizations: 0,
        });
    });

    it('allows the maximum concurrency value', async () => {
        const result = await processFiles(
            [],
            {
                concurrency: 4,
            },
        );

        expect(result.summary.totalFiles).toBe(0);
    });
});