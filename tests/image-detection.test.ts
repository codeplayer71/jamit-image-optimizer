import {
    describe,
    expect,
    it,
} from 'vitest';

import { detectImageFormat } from '../src/image-detection';

function createJpegBuffer(): ArrayBuffer {
    return new Uint8Array([
        0xff,
        0xd8,
        0xff,
        0xe0,
    ]).buffer;
}

function createPngBuffer(): ArrayBuffer {
    return new Uint8Array([
        0x89,
        0x50,
        0x4e,
        0x47,
        0x0d,
        0x0a,
        0x1a,
        0x0a,
    ]).buffer;
}

function createWebPBuffer(): ArrayBuffer {
    return new Uint8Array([
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
}

describe('detectImageFormat', () => {
    it('uses the file signature when MIME type matches', () => {
        const file = new File(
            [],
            'photo.jpg',
            {
                type: 'image/jpeg',
            },
        );

        expect(
            detectImageFormat(
                file,
                createJpegBuffer(),
            ),
        ).toBe('jpeg');
    });

    it('prefers the file signature over an incorrect MIME type', () => {
        const file = new File(
            [],
            'photo.png',
            {
                type: 'image/png',
            },
        );

        expect(
            detectImageFormat(
                file,
                createJpegBuffer(),
            ),
        ).toBe('jpeg');
    });

    it('detects an image when the MIME type is empty', () => {
        const file = new File(
            [],
            'photo',
        );

        expect(
            detectImageFormat(
                file,
                createWebPBuffer(),
            ),
        ).toBe('webp');
    });

    it('uses the HEIC MIME type when no sniffable signature is found', () => {
        const file = new File(
            [],
            'photo.heic',
            {
                type: 'image/heic',
            },
        );

        expect(
            detectImageFormat(
                file,
                new ArrayBuffer(16),
            ),
        ).toBe('heic');
    });

    it('uses the HEIF MIME type when no sniffable signature is found', () => {
        const file = new File(
            [],
            'photo.heif',
            {
                type: 'image/heif',
            },
        );

        expect(
            detectImageFormat(
                file,
                new ArrayBuffer(16),
            ),
        ).toBe('heif');
    });

    it('does not trust a JPEG MIME type when the signature is unknown', () => {
        const file = new File(
            [],
            'photo.jpg',
            {
                type: 'image/jpeg',
            },
        );

        expect(
            detectImageFormat(
                file,
                new Uint8Array([
                    0x01,
                    0x02,
                    0x03,
                    0x04,
                ]).buffer,
            ),
        ).toBeNull();
    });

    it('detects PNG independently of the filename', () => {
        const file = new File(
            [],
            'wrong.jpg',
            {
                type: 'image/jpeg',
            },
        );

        expect(
            detectImageFormat(
                file,
                createPngBuffer(),
            ),
        ).toBe('png');
    });
});