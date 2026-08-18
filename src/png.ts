const PNG_SIGNATURE = [
    0x89,
    0x50,
    0x4e,
    0x47,
    0x0d,
    0x0a,
    0x1a,
    0x0a,
] as const;

export function isAnimatedPng(buffer: ArrayBuffer): boolean {
    const bytes = new Uint8Array(buffer);

    if (bytes.length < PNG_SIGNATURE.length) {
        return false;
    }

    const hasValidSignature = PNG_SIGNATURE.every(
        (value, index) => bytes[index] === value,
    );

    if (!hasValidSignature) {
        return false;
    }

    const view = new DataView(buffer);
    let offset: number = PNG_SIGNATURE.length;

    while (offset + 12 <= bytes.length) {
        const dataLength = view.getUint32(offset);
        const typeOffset = offset + 4;

        const chunkType = String.fromCharCode(
            bytes[typeOffset] ?? 0,
            bytes[typeOffset + 1] ?? 0,
            bytes[typeOffset + 2] ?? 0,
            bytes[typeOffset + 3] ?? 0,
        );

        if (chunkType === 'acTL') {
            return true;
        }

        if (chunkType === 'IEND') {
            return false;
        }

        const nextOffset = offset + 12 + dataLength;

        if (nextOffset <= offset || nextOffset > bytes.length) {
            return false;
        }

        offset = nextOffset;
    }

    return false;
}