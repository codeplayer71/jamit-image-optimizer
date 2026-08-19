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
            detectImageFormatFromBytes(
                buffer,
            ),
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
            detectImageFormatFromBytes(
                buffer,
            ),
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
            detectImageFormatFromBytes(
                buffer,
            ),
        ).toBe('webp');
    });

    it('detects HEIC from its major brand', () => {
        const buffer = createFtypBuffer(
            'heic',
        );

        expect(
            detectImageFormatFromBytes(
                buffer,
            ),
        ).toBe('heic');
    });

    it('detects HEIC from a compatible brand', () => {
        const buffer = createFtypBuffer(
            'mif1',
            [
                'heix',
            ],
        );

        expect(
            detectImageFormatFromBytes(
                buffer,
            ),
        ).toBe('heic');
    });

    it('detects generic HEIF from its structural brand', () => {
        const buffer = createFtypBuffer(
            'mif1',
        );

        expect(
            detectImageFormatFromBytes(
                buffer,
            ),
        ).toBe('heif');
    });

    it('does not classify AVIF as HEIF', () => {
        const buffer = createFtypBuffer(
            'avif',
            [
                'mif1',
                'MA1B',
            ],
        );

        expect(
            detectImageFormatFromBytes(
                buffer,
            ),
        ).toBeNull();
    });

    it('does not classify a HEIF container with AVIF compatibility as HEIF', () => {
        const buffer = createFtypBuffer(
            'mif1',
            [
                'avif',
                'MA1B',
            ],
        );

        expect(
            detectImageFormatFromBytes(
                buffer,
            ),
        ).toBeNull();
    });

    it('does not classify HEVC image sequences as static HEIC', () => {
        const buffer = createFtypBuffer(
            'hevc',
            [
                'msf1',
            ],
        );

        expect(
            detectImageFormatFromBytes(
                buffer,
            ),
        ).toBeNull();
    });

    it('returns null for unknown data', () => {
        const buffer = new Uint8Array([
            0x01,
            0x02,
            0x03,
            0x04,
        ]).buffer;

        expect(
            detectImageFormatFromBytes(
                buffer,
            ),
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

function createFtypBuffer(
    majorBrand: string,
    compatibleBrands: string[] = [],
): ArrayBuffer {
    const size =
        16 +
        compatibleBrands.length * 4;

    const bytes =
        new Uint8Array(size);

    const view =
        new DataView(bytes.buffer);

    view.setUint32(
        0,
        size,
    );

    writeFourCc(
        bytes,
        4,
        'ftyp',
    );

    writeFourCc(
        bytes,
        8,
        majorBrand,
    );

    for (
        let index = 0;
        index < compatibleBrands.length;
        index += 1
    ) {
        writeFourCc(
            bytes,
            16 + index * 4,
            compatibleBrands[index]!,
        );
    }

    return bytes.buffer;
}

function writeFourCc(
    bytes: Uint8Array,
    offset: number,
    value: string,
): void {
    if (value.length !== 4) {
        throw new Error(
            'FourCC must contain exactly four characters.',
        );
    }

    for (
        let index = 0;
        index < 4;
        index += 1
    ) {
        bytes[offset + index] =
            value.charCodeAt(index);
    }
}