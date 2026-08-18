export type FileClassification =
    | 'supported-image'
    | 'unsupported-image'
    | 'passthrough';

const SUPPORTED_IMAGE_TYPES = new Set([
    'image/jpeg',
]);

export function classifyFile(file: File): FileClassification {
    if (SUPPORTED_IMAGE_TYPES.has(file.type)) {
        return 'supported-image';
    }

    if (file.type.startsWith('image/')) {
        return 'unsupported-image';
    }

    return 'passthrough';
}