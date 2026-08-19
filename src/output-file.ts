import type { ImageOutputFormat } from './types';

const MIME_TYPE_BY_FORMAT: Record<
    ImageOutputFormat,
    string
> = {
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
};

const EXTENSION_BY_FORMAT: Record<
    ImageOutputFormat,
    string
> = {
    jpeg: 'jpg',
    png: 'png',
    webp: 'webp',
};

export function getOutputMimeType(
    format: ImageOutputFormat,
): string {
    return MIME_TYPE_BY_FORMAT[format];
}

export function getOutputFileName(
    fileName: string,
    format: ImageOutputFormat,
): string {
    const extension = EXTENSION_BY_FORMAT[format];

    const lastDotIndex = fileName.lastIndexOf('.');

    if (lastDotIndex <= 0) {
        return `${fileName}.${extension}`;
    }

    return `${fileName.slice(0, lastDotIndex)}.${extension}`;
}