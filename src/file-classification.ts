import { getImageFormat } from './image-format';
import { detectImageFormatFromBytes } from './image-signature';

export type FileClassification =
    | 'supported-image'
    | 'unsupported-image'
    | 'passthrough';

const IMAGE_SIGNATURE_BYTES = 64;

export async function classifyFile(
    file: File,
): Promise<FileClassification> {
    const signatureFormat =
        await detectFileSignatureFormat(file);

    if (signatureFormat) {
        return 'supported-image';
    }

    const mimeFormat = getImageFormat(file);

    if (
        mimeFormat === 'heic' ||
        mimeFormat === 'heif'
    ) {
        return 'supported-image';
    }

    if (
        mimeFormat ||
        file.type.startsWith('image/')
    ) {
        return 'unsupported-image';
    }

    return 'passthrough';
}

async function detectFileSignatureFormat(
    file: File,
): Promise<
    ReturnType<typeof detectImageFormatFromBytes>
> {
    try {
        const buffer = await file
            .slice(0, IMAGE_SIGNATURE_BYTES)
            .arrayBuffer();

        return detectImageFormatFromBytes(
            buffer,
        );
    } catch {
        return null;
    }
}