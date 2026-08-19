import { getImageFormat } from './image-format';

export type FileClassification =
    | 'supported-image'
    | 'unsupported-image'
    | 'passthrough';

const SUPPORTED_PROCESSING_FORMATS = new Set([
    'jpeg',
    'png',
    'webp',
    'heic',
    'heif',
]);

export function classifyFile(file: File): FileClassification {
    const format = getImageFormat(file);

    if (format && SUPPORTED_PROCESSING_FORMATS.has(format)) {
        return 'supported-image';
    }

    if (format || file.type.startsWith('image/')) {
        return 'unsupported-image';
    }

    return 'passthrough';
}