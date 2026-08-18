export type ImageFormat =
    | 'jpeg'
    | 'png'
    | 'webp'
    | 'heic'
    | 'heif';

const IMAGE_FORMAT_BY_MIME_TYPE: Readonly<Record<string, ImageFormat>> = {
    'image/jpeg': 'jpeg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/heic': 'heic',
    'image/heif': 'heif',
};

export function getImageFormat(file: File): ImageFormat | null {
    return IMAGE_FORMAT_BY_MIME_TYPE[file.type] ?? null;
}