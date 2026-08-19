import { getImageFormat } from './image-format';
import type { ImageFormat } from './image-format';
import {
    detectImageFormatFromBytes,
} from './image-signature';

export function detectImageFormat(
    file: File,
    buffer: ArrayBuffer,
): ImageFormat | null {
    const signatureFormat =
        detectImageFormatFromBytes(buffer);

    if (signatureFormat) {
        return signatureFormat;
    }

    const mimeFormat = getImageFormat(file);

    if (
        mimeFormat === 'heic' ||
        mimeFormat === 'heif'
    ) {
        return mimeFormat;
    }

    return null;
}