import type { ImageFormat } from './image-format';

export type SniffableImageFormat = Extract<
    ImageFormat,
    'jpeg' | 'png' | 'webp' | 'heic' | 'heif'
>;

const HEIC_BRANDS = new Set([
    'heic',
    'heix',
    'heim',
    'heis',
]);

const HEIF_STRUCTURAL_BRANDS = new Set([
    'mif1',
    'mif2',
]);

const IMAGE_SEQUENCE_BRANDS = new Set([
    'hevc',
    'hevx',
    'hevm',
    'hevs',
    'msf1',
]);

const AVIF_BRANDS = new Set([
    'avif',
    'avis',
    'avio',
    'MA1A',
    'MA1B',
]);

export function detectImageFormatFromBytes(
    buffer: ArrayBuffer,
): SniffableImageFormat | null {
    const bytes = new Uint8Array(buffer);

    if (
        bytes.length >= 3 &&
        bytes[0] === 0xff &&
        bytes[1] === 0xd8 &&
        bytes[2] === 0xff
    ) {
        return 'jpeg';
    }

    if (
        bytes.length >= 8 &&
        bytes[0] === 0x89 &&
        bytes[1] === 0x50 &&
        bytes[2] === 0x4e &&
        bytes[3] === 0x47 &&
        bytes[4] === 0x0d &&
        bytes[5] === 0x0a &&
        bytes[6] === 0x1a &&
        bytes[7] === 0x0a
    ) {
        return 'png';
    }

    if (
        bytes.length >= 12 &&
        bytes[0] === 0x52 &&
        bytes[1] === 0x49 &&
        bytes[2] === 0x46 &&
        bytes[3] === 0x46 &&
        bytes[8] === 0x57 &&
        bytes[9] === 0x45 &&
        bytes[10] === 0x42 &&
        bytes[11] === 0x50
    ) {
        return 'webp';
    }

    return detectHeifFormat(bytes);
}

function detectHeifFormat(
    bytes: Uint8Array,
): Extract<
    SniffableImageFormat,
    'heic' | 'heif'
> | null {
    if (
        bytes.length < 16 ||
        readFourCc(bytes, 4) !== 'ftyp'
    ) {
        return null;
    }

    const view = new DataView(
        bytes.buffer,
        bytes.byteOffset,
        bytes.byteLength,
    );

    const boxSize = view.getUint32(0);

    if (
        boxSize === 1 ||
        (
            boxSize !== 0 &&
            boxSize < 16
        )
    ) {
        return null;
    }

    const boxEnd =
        boxSize === 0
            ? bytes.length
            : Math.min(
                boxSize,
                bytes.length,
            );

    const majorBrand = readFourCc(
        bytes,
        8,
    );

    if (!majorBrand) {
        return null;
    }

    const brands = new Set<string>([
        majorBrand,
    ]);

    for (
        let offset = 16;
        offset + 4 <= boxEnd;
        offset += 4
    ) {
        const brand = readFourCc(
            bytes,
            offset,
        );

        if (brand) {
            brands.add(brand);
        }
    }

    if (
        hasAnyBrand(
            brands,
            AVIF_BRANDS,
        )
    ) {
        return null;
    }

    if (
        hasAnyBrand(
            brands,
            IMAGE_SEQUENCE_BRANDS,
        )
    ) {
        return null;
    }

    if (
        hasAnyBrand(
            brands,
            HEIC_BRANDS,
        )
    ) {
        return 'heic';
    }

    if (
        hasAnyBrand(
            brands,
            HEIF_STRUCTURAL_BRANDS,
        )
    ) {
        return 'heif';
    }

    return null;
}

function hasAnyBrand(
    brands: ReadonlySet<string>,
    candidates: ReadonlySet<string>,
): boolean {
    for (const brand of candidates) {
        if (brands.has(brand)) {
            return true;
        }
    }

    return false;
}

function readFourCc(
    bytes: Uint8Array,
    offset: number,
): string | null {
    if (offset + 4 > bytes.length) {
        return null;
    }

    return String.fromCharCode(
        bytes[offset]!,
        bytes[offset + 1]!,
        bytes[offset + 2]!,
        bytes[offset + 3]!,
    );
}