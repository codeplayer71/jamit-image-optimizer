import { afterEach, describe, expect, it, vi } from 'vitest';

import { optimizeImage } from '../src';

class WorkerMock {
    onmessage: ((event: MessageEvent) => void) | null = null;
    onerror: ((event: ErrorEvent) => void) | null = null;

    postMessage(): void {
        const buffer = new ArrayBuffer(8);

        this.onmessage?.({
            data: {
                buffer,
                width: 100,
                height: 100,
                decodeMs: 10,
                encodeMs: 20,
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
        expect(result.output.size).toBe(file.size);
        expect(result.savings.bytes).toBe(0);
        expect(result.savings.ratio).toBe(1);
        expect(result.savings.percent).toBe(0);
    });

    it('returns the optimized file when the encoded output is smaller', async () => {
        vi.stubGlobal(
            'Worker',
            class extends WorkerMock {
                override postMessage(): void {
                    const buffer = new ArrayBuffer(2);

                    this.onmessage?.({
                        data: {
                            buffer,
                            width: 100,
                            height: 100,
                            decodeMs: 10,
                            encodeMs: 20,
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
            width: 100,
            height: 100,
        });

        expect(result.output).toEqual({
            name: 'image.jpg',
            type: 'image/jpeg',
            size: 2,
            width: 100,
            height: 100,
        });

        expect(result.output.size).toBe(2);
        expect(result.savings.bytes).toBe(2);
        expect(result.savings.ratio).toBe(0.5);
        expect(result.savings.percent).toBe(50);
    });
});