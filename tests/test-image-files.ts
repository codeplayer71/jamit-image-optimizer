type TestImageFormat =
    | 'jpeg'
    | 'png'
    | 'webp';

const SIGNATURES: Record<
    TestImageFormat,
    readonly number[]
> = {
    jpeg: [
        0xff,
        0xd8,
        0xff,
        0xe0,
    ],
    png: [
        0x89,
        0x50,
        0x4e,
        0x47,
        0x0d,
        0x0a,
        0x1a,
        0x0a,
    ],
    webp: [
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
    ],
};

const MIME_TYPES: Record<
    TestImageFormat,
    string
> = {
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
};

const EXTENSIONS: Record<
    TestImageFormat,
    string
> = {
    jpeg: 'jpg',
    png: 'png',
    webp: 'webp',
};

export function createTestImageFile(
    format: TestImageFormat,
    options: {
        name?: string;
        size?: number;
        type?: string;
        lastModified?: number;
    } = {},
): File {
    const signature = SIGNATURES[format];

    const size =
        options.size ??
        signature.length;

    if (size < signature.length) {
        throw new Error(
            `Test ${format} file must contain at least ${signature.length} bytes.`,
        );
    }

    const bytes = new Uint8Array(size);

    bytes.set(signature);

    return new File(
        [bytes],
        options.name ??
        `photo.${EXTENSIONS[format]}`,
        {
            type:
                options.type ??
                MIME_TYPES[format],
            ...(options.lastModified !== undefined && {
                lastModified:
                options.lastModified,
            }),
        },
    );
}