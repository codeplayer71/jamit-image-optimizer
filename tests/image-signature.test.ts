import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    detectImageFormatFromBytes,
} from '../src/image-signature';

describe('detectImageFormatFromBytes', () => {
    it('detects JPEG', () => {
        const buffer = new Uint8Array([
            0xff,
            0xd8,
            0xff,
            0xe0,
        ]).buffer;

        expect(
            detectImageFormatFromBytes(buffer),
        ).toBe('jpeg');
    });

    it('detects PNG', () => {
        const buffer = new Uint8Array([
            0x89,
            0x50,
            0x4e,
            0x47,
            0x0d,
            0x0a,
            0x1a,
            0x0a,
        ]).buffer;

        expect(
            detectImageFormatFromBytes(buffer),
        ).toBe('png');
    });

    it('detects WebP', () => {
        const buffer = new Uint8Array([
            0x52,
            0x49,
            0x46,
            0x46,
            0x00,
            0x00,
            0x00,
            0x00,
            0x57,
            0x45,
            0x42,
            0x50,
        ]).buffer;

        expect(
            detectImageFormatFromBytes(buffer),
        ).toBe('webp');
    });

    it('returns null for unknown data', () => {
        const buffer = new Uint8Array([
            0x01,
            0x02,
            0x03,
            0x04,
        ]).buffer;

        expect(
            detectImageFormatFromBytes(buffer),
        ).toBeNull();
    });

    it('handles empty data', () => {
        expect(
            detectImageFormatFromBytes(
                new ArrayBuffer(0),
            ),
        ).toBeNull();
    });
});