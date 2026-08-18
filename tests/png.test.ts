import { describe, expect, it } from 'vitest';

import { isAnimatedPng } from '../src/png';

const PNG_SIGNATURE = [
    0x89,
    0x50,
    0x4e,
    0x47,
    0x0d,
    0x0a,
    0x1a,
    0x0a,
];

function createPngWithChunk(chunkType: string): ArrayBuffer {
    const bytes = new Uint8Array([
        ...PNG_SIGNATURE,

        0x00,
        0x00,
        0x00,
        0x00,

        ...chunkType.split('').map((character) => character.charCodeAt(0)),

        0x00,
        0x00,
        0x00,
        0x00,
    ]);

    return bytes.buffer;
}

describe('isAnimatedPng', () => {
    it('detects an APNG animation control chunk', () => {
        expect(
            isAnimatedPng(createPngWithChunk('acTL')),
        ).toBe(true);
    });

    it('does not classify a regular PNG as animated', () => {
        expect(
            isAnimatedPng(createPngWithChunk('IEND')),
        ).toBe(false);
    });

    it('rejects invalid PNG data', () => {
        expect(
            isAnimatedPng(new Uint8Array([1, 2, 3, 4]).buffer),
        ).toBe(false);
    });
});