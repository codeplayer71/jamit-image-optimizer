function readFourCC(
    bytes: Uint8Array,
    offset: number,
): string {
    return String.fromCharCode(
        bytes[offset] ?? 0,
        bytes[offset + 1] ?? 0,
        bytes[offset + 2] ?? 0,
        bytes[offset + 3] ?? 0,
    );
}

export function isAnimatedWebP(buffer: ArrayBuffer): boolean {
    const bytes = new Uint8Array(buffer);

    if (
        bytes.length < 12 ||
        readFourCC(bytes, 0) !== 'RIFF' ||
        readFourCC(bytes, 8) !== 'WEBP'
    ) {
        return false;
    }

    let offset = 12;

    while (offset + 8 <= bytes.length) {
        const chunkType = readFourCC(bytes, offset);

        const view = new DataView(
            bytes.buffer,
            bytes.byteOffset + offset + 4,
            4,
        );

        const chunkSize = view.getUint32(0, true);

        if (
            chunkType === 'ANIM' ||
            chunkType === 'ANMF'
        ) {
            return true;
        }

        const paddedChunkSize =
            chunkSize + (chunkSize % 2);

        offset += 8 + paddedChunkSize;
    }

    return false;
}