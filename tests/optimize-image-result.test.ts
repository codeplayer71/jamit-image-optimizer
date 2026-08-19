import { afterEach, describe, expect, it, vi } from 'vitest';

import { optimizeImage } from '../src';

class WorkerMock {
    onmessage: ((event: MessageEvent) => void) | null = null;
    onerror: ((event: ErrorEvent) => void) | null = null;

    postMessage(): void {
        const buffer = new ArrayBuffer(8);

        this.onmessage?.({
            data: {
                type: 'result',
                buffer,
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
    }

    terminate(): void {}
}

describe('optimizeImage result', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('keeps the original file when the encoded output is larger', async () => {
        vi.stubGlobal('Worker', WorkerMock);

        const file = new File(
            [new Uint8Array(4)],
            'image.jpg',
            {
                type: 'image/jpeg',
                lastModified: 123,
            },
        );

        const result = await optimizeImage(file);

        expect(result.file).toBe(file);
        expect(result.optimized).toBe(false);
        expect(result.reason).toBe('output-larger-than-input');

        expect(result.original).toEqual({
            name: 'image.jpg',
            type: 'image/jpeg',
            size: 4,
            width: 100,
            height: 100,
        });

        expect(result.output).toEqual({
            name: 'image.jpg',
            type: 'image/jpeg',
            size: 4,
            width: 100,
            height: 100,
        });

        expect(result.savings).toEqual({
            bytes: 0,
            ratio: 0,
            percent: 0,
        });

        expect(result.sizeChange).toEqual({
            bytes: 0,
            ratio: 0,
            percent: 0,
        });
    });

    it('returns the optimized file when the encoded output is smaller', async () => {
        vi.stubGlobal(
            'Worker',
            class extends WorkerMock {
                override postMessage(): void {
                    const buffer = new ArrayBuffer(2);

                    this.onmessage?.({
                        data: {
                            type: 'result',
                            buffer,
                            originalWidth: 200,
                            originalHeight: 100,
                            outputWidth: 100,
                            outputHeight: 50,
                            decodeMs: 10,
                            resizeMs: 5,
                            encodeMs: 20,
                            finalQuality: 80,
                            encodeAttempts: 1,
                        },
                    } as MessageEvent);
                }
            },
        );

        const file = new File(
            [new Uint8Array(4)],
            'image.jpg',
            {
                type: 'image/jpeg',
                lastModified: 123,
            },
        );

        const result = await optimizeImage(file);

        expect(result.file).not.toBe(file);
        expect(result.optimized).toBe(true);
        expect(result.reason).toBeUndefined();

        expect(result.file.name).toBe('image.jpg');
        expect(result.file.type).toBe('image/jpeg');
        expect(result.file.lastModified).toBe(123);

        expect(result.original).toEqual({
            name: 'image.jpg',
            type: 'image/jpeg',
            size: 4,
            width: 200,
            height: 100,
        });

        expect(result.output).toEqual({
            name: 'image.jpg',
            type: 'image/jpeg',
            size: 2,
            width: 100,
            height: 50,
        });

        expect(result.compression).toEqual({
            quality: 0.8,
            encodeAttempts: 1,
        });

        expect(result.savings.bytes).toBe(2);
        expect(result.savings.ratio).toBe(0.5);
        expect(result.savings.percent).toBe(50);

        expect(result.timing.decodeMs).toBe(10);
        expect(result.timing.resizeMs).toBe(5);
        expect(result.timing.encodeMs).toBe(20);
    });

    it('terminates the active worker when aborted', async () => {
        const terminate = vi.fn();

        let resolveWorkerCreated!: () => void;

        const workerCreated = new Promise<void>((resolve) => {
            resolveWorkerCreated = resolve;
        });

        vi.stubGlobal(
            'Worker',
            class {
                onmessage: ((event: MessageEvent) => void) | null = null;
                onerror: ((event: ErrorEvent) => void) | null = null;

                constructor() {
                    resolveWorkerCreated();
                }

                postMessage(): void {}

                terminate(): void {
                    terminate();
                }
            },
        );

        const controller = new AbortController();

        const file = new File(
            [new Uint8Array(4)],
            'image.jpg',
            {
                type: 'image/jpeg',
            },
        );

        const promise = optimizeImage(file, {
            signal: controller.signal,
        });

        await workerCreated;

        controller.abort();

        await expect(promise).rejects.toMatchObject({
            code: 'aborted',
        });

        expect(terminate).toHaveBeenCalledOnce();
    });

    it('emits processing stages in order', async () => {
        vi.stubGlobal(
            'Worker',
            class extends WorkerMock {
                override postMessage(): void {
                    this.onmessage?.({
                        data: {
                            type: 'status',
                            stage: 'decoding',
                            progress: null,
                        },
                    } as MessageEvent);

                    this.onmessage?.({
                        data: {
                            type: 'status',
                            stage: 'resizing',
                            progress: null,
                        },
                    } as MessageEvent);

                    this.onmessage?.({
                        data: {
                            type: 'status',
                            stage: 'encoding',
                            progress: null,
                        },
                    } as MessageEvent);

                    this.onmessage?.({
                        data: {
                            type: 'result',
                            buffer: new ArrayBuffer(2),
                            originalWidth: 200,
                            originalHeight: 100,
                            outputWidth: 100,
                            outputHeight: 50,
                            decodeMs: 10,
                            resizeMs: 5,
                            encodeMs: 20,
                            finalQuality: 80,
                            encodeAttempts: 1,
                        },
                    } as MessageEvent);
                }
            },
        );

        const file = new File(
            [new Uint8Array(4)],
            'image.jpg',
            {
                type: 'image/jpeg',
            },
        );

        const statuses: string[] = [];

        await optimizeImage(file, {
            onStatus(status) {
                statuses.push(status.stage);
            },
        });

        expect(statuses).toEqual([
            'queued',
            'decoding',
            'resizing',
            'encoding',
            'finalizing',
            'completed',
        ]);
    });

    it('returns target-size compression metadata', async () => {
        vi.stubGlobal(
            'Worker',
            class extends WorkerMock {
                override postMessage(): void {
                    this.onmessage?.({
                        data: {
                            type: 'result',
                            buffer: new ArrayBuffer(2),
                            originalWidth: 200,
                            originalHeight: 100,
                            outputWidth: 100,
                            outputHeight: 50,
                            decodeMs: 10,
                            resizeMs: 5,
                            encodeMs: 40,
                            finalQuality: 68,
                            encodeAttempts: 4,
                            targetReached: true,
                        },
                    } as MessageEvent);
                }
            },
        );

        const file = new File(
            [new Uint8Array(4)],
            'image.jpg',
            {
                type: 'image/jpeg',
            },
        );

        const result = await optimizeImage(file, {
            quality: 0.85,
            targetSize: 1_000_000,
            minQuality: 0.6,
        });

        expect(result.compression).toEqual({
            quality: 0.68,
            encodeAttempts: 4,
            targetSize: 1_000_000,
            targetReached: true,
        });
    });

    it('returns a PNG result without JPEG-specific quality metadata', async () => {
        vi.stubGlobal(
            'Worker',
            class extends WorkerMock {
                override postMessage(): void {
                    this.onmessage?.({
                        data: {
                            type: 'result',
                            buffer: new ArrayBuffer(2),
                            originalWidth: 200,
                            originalHeight: 100,
                            outputWidth: 100,
                            outputHeight: 50,
                            decodeMs: 10,
                            resizeMs: 5,
                            encodeMs: 20,
                            encodeAttempts: 1,
                        },
                    } as MessageEvent);
                }
            },
        );

        const file = new File(
            [new Uint8Array(4)],
            'image.png',
            {
                type: 'image/png',
                lastModified: 123,
            },
        );

        const result = await optimizeImage(file, {
            quality: 0.8,
            targetSize: 500_000,
            minQuality: 0.5,
            resize: {
                maxWidth: 100,
            },
        });

        expect(result.optimized).toBe(true);

        expect(result.file.name).toBe('image.png');
        expect(result.file.type).toBe('image/png');
        expect(result.file.lastModified).toBe(123);

        expect(result.output).toEqual({
            name: 'image.png',
            type: 'image/png',
            size: 2,
            width: 100,
            height: 50,
        });

        expect(result.compression).toEqual({
            encodeAttempts: 1,
        });
    });

    it('returns WebP target-size compression metadata', async () => {
        vi.stubGlobal(
            'Worker',
            class extends WorkerMock {
                override postMessage(): void {
                    this.onmessage?.({
                        data: {
                            type: 'result',
                            buffer: new ArrayBuffer(2),
                            originalWidth: 200,
                            originalHeight: 100,
                            outputWidth: 100,
                            outputHeight: 50,
                            decodeMs: 10,
                            resizeMs: 5,
                            encodeMs: 40,
                            finalQuality: 72,
                            encodeAttempts: 5,
                            targetReached: true,
                        },
                    } as MessageEvent);
                }
            },
        );

        const file = new File(
            [new Uint8Array(4)],
            'image.webp',
            {
                type: 'image/webp',
                lastModified: 123,
            },
        );

        const result = await optimizeImage(file, {
            quality: 0.85,
            targetSize: 500_000,
            minQuality: 0.5,
            resize: {
                maxWidth: 100,
            },
        });

        expect(result.optimized).toBe(true);

        expect(result.file.name).toBe('image.webp');
        expect(result.file.type).toBe('image/webp');
        expect(result.file.lastModified).toBe(123);

        expect(result.output).toEqual({
            name: 'image.webp',
            type: 'image/webp',
            size: 2,
            width: 100,
            height: 50,
        });

        expect(result.compression).toEqual({
            quality: 0.72,
            encodeAttempts: 5,
            targetSize: 500_000,
            targetReached: true,
        });
    });

    it('keeps the requested WebP format even when conversion increases file size', async () => {
        vi.stubGlobal(
            'Worker',
            class extends WorkerMock {
                override postMessage(): void {
                    this.onmessage?.({
                        data: {
                            type: 'result',
                            buffer: new ArrayBuffer(8),
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
            },
        );

        const file = new File(
            [new Uint8Array(4)],
            'photo.jpg',
            {
                type: 'image/jpeg',
                lastModified: 123,
            },
        );

        const result = await optimizeImage(file, {
            mode: 'format',
            format: 'webp',
            quality: 0.8,
        });

        expect(result.file).not.toBe(file);
        expect(result.file.name).toBe('photo.webp');
        expect(result.file.type).toBe('image/webp');
        expect(result.file.size).toBe(8);

        expect(result.output).toMatchObject({
            name: 'photo.webp',
            type: 'image/webp',
            size: 8,
        });
    });

    it('converts PNG to JPEG when JPEG output is requested', async () => {
        vi.stubGlobal(
            'Worker',
            class extends WorkerMock {
                override postMessage(): void {
                    this.onmessage?.({
                        data: {
                            type: 'result',
                            buffer: new ArrayBuffer(2),
                            originalWidth: 200,
                            originalHeight: 100,
                            outputWidth: 100,
                            outputHeight: 50,
                            decodeMs: 10,
                            resizeMs: 5,
                            encodeMs: 20,
                            finalQuality: 80,
                            encodeAttempts: 1,
                        },
                    } as MessageEvent);
                }
            },
        );

        const file = new File(
            [new Uint8Array(4)],
            'photo.png',
            {
                type: 'image/png',
                lastModified: 123,
            },
        );

        const result = await optimizeImage(file, {
            mode: 'format',
            format: 'jpeg',
            quality: 0.8,
        });

        expect(result.optimized).toBe(true);

        expect(result.file.name).toBe('photo.jpg');
        expect(result.file.type).toBe('image/jpeg');
        expect(result.file.lastModified).toBe(123);

        expect(result.output).toMatchObject({
            name: 'photo.jpg',
            type: 'image/jpeg',
            size: 2,
            width: 100,
            height: 50,
        });

        expect(result.compression).toEqual({
            quality: 0.8,
            encodeAttempts: 1,
        });
    });

    it('converts JPEG to PNG when PNG output is requested', async () => {
        vi.stubGlobal(
            'Worker',
            class extends WorkerMock {
                override postMessage(): void {
                    this.onmessage?.({
                        data: {
                            type: 'result',
                            buffer: new ArrayBuffer(8),
                            originalWidth: 200,
                            originalHeight: 100,
                            outputWidth: 200,
                            outputHeight: 100,
                            decodeMs: 10,
                            resizeMs: 0,
                            encodeMs: 20,
                            encodeAttempts: 1,
                        },
                    } as MessageEvent);
                }
            },
        );

        const file = new File(
            [new Uint8Array(4)],
            'photo.jpg',
            {
                type: 'image/jpeg',
                lastModified: 123,
            },
        );

        const result = await optimizeImage(file, {
            mode: 'format',
            format: 'png',
        });

        expect(result.optimized).toBe(false);
        expect(result.converted).toBe(true);
        expect(result.changed).toBe(true);

        expect(result.file.name).toBe('photo.png');
        expect(result.file.type).toBe('image/png');
        expect(result.file.size).toBe(8);
        expect(result.file.lastModified).toBe(123);

        expect(result.output).toEqual({
            name: 'photo.png',
            type: 'image/png',
            size: 8,
            width: 200,
            height: 100,
        });

        expect(result.compression).toEqual({
            encodeAttempts: 1,
        });
    });

    it('passes HEIC through the worker when an output format is requested', async () => {
        let postedMessage: unknown;

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
                    postedMessage = message;

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

        const file = new File(
            [new Uint8Array(4)],
            'photo.heic',
            {
                type: 'image/heic',
                lastModified: 123,
            },
        );

        const result = await optimizeImage(file, {
            mode: 'format',
            format: 'webp',
            quality: 0.8,
        });

        expect(postedMessage).toMatchObject({
            inputFormat: 'heic',
            outputFormat: 'webp',
        });

        expect(result.file.name).toBe('photo.webp');
        expect(result.file.type).toBe('image/webp');

        expect(result.converted).toBe(true);
        expect(result.changed).toBe(true);
    });

    it('keeps the original file in auto mode when WebP is larger', async () => {
        vi.stubGlobal(
            'Worker',
            class extends WorkerMock {
                override postMessage(): void {
                    this.onmessage?.({
                        data: {
                            type: 'result',
                            buffer: new ArrayBuffer(8),
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
            },
        );

        const file = new File(
            [new Uint8Array(4)],
            'photo.jpg',
            {
                type: 'image/jpeg',
            },
        );

        const result = await optimizeImage(file, {
            mode: 'auto',
        });

        expect(result.file).toBe(file);

        expect(result.optimized).toBe(false);
        expect(result.converted).toBe(false);
        expect(result.changed).toBe(false);

        expect(result.reason).toBe(
            'output-larger-than-input',
        );

        expect(result.savings).toEqual({
            bytes: 0,
            ratio: 0,
            percent: 0,
        });

        expect(result.sizeChange).toEqual({
            bytes: 0,
            ratio: 0,
            percent: 0,
        });
    });

    it('returns WebP in auto mode when WebP is smaller', async () => {
        vi.stubGlobal(
            'Worker',
            class extends WorkerMock {
                override postMessage(): void {
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
            },
        );

        const file = new File(
            [new Uint8Array(4)],
            'photo.jpg',
            {
                type: 'image/jpeg',
            },
        );

        const result = await optimizeImage(file, {
            mode: 'auto',
        });

        expect(result.file.name).toBe('photo.webp');
        expect(result.file.type).toBe('image/webp');

        expect(result.optimized).toBe(true);
        expect(result.converted).toBe(true);
        expect(result.changed).toBe(true);

        expect(result.savings).toEqual({
            bytes: 2,
            ratio: 0.5,
            percent: 50,
        });

        expect(result.sizeChange).toEqual({
            bytes: -2,
            ratio: -0.5,
            percent: -50,
        });
    });
});