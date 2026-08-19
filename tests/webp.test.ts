import { describe, expect, it } from 'vitest';

import { isAnimatedWebP } from '../src/webp';

function createWebP(
    chunkType: string,
    chunkData: number[] = [],
): ArrayBuffer {
    const chunkSize = chunkData.length;
    const paddedChunkSize =
        chunkSize + (chunkSize % 2);

    const bytes = new Uint8Array(
        12 + 8 + paddedChunkSize,
    );

    bytes.set(
        [...'RIFF'].map((character) =>
            character.charCodeAt(0),
        ),
        0,
    );

    bytes.set(
        [...'WEBP'].map((character) =>
            character.charCodeAt(0),
        ),
        8,
    );

    bytes.set(
        [...chunkType].map((character) =>
            character.charCodeAt(0),
        ),
        12,
    );

    new DataView(bytes.buffer).setUint32(
        16,
        chunkSize,
        true,
    );

    bytes.set(chunkData, 20);

    return bytes.buffer;
}

describe('isAnimatedWebP', () => {
    it('detects an ANIM chunk', () => {
        const buffer = createWebP('ANIM');

        expect(isAnimatedWebP(buffer)).toBe(true);
    });

    it('detects an ANMF chunk', () => {
        const buffer = createWebP('ANMF');

        expect(isAnimatedWebP(buffer)).toBe(true);
    });

    it('returns false for a static WebP chunk', () => {
        const buffer = createWebP('VP8 ');

        expect(isAnimatedWebP(buffer)).toBe(false);
    });

    it('returns false for invalid WebP data', () => {
        const buffer = new Uint8Array([
            1,
            2,
            3,
            4,
        ]).buffer;

        expect(isAnimatedWebP(buffer)).toBe(false);
    });
});