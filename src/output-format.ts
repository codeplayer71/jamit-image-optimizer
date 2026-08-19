import type { ImageFormat } from './image-format';
import type {
    ImageOptimizationOptions,
    ImageOutputFormat,
} from './types';

type OutputFormatOptions = Pick<
    ImageOptimizationOptions,
    'mode' | 'format'
>;

export function resolveOutputFormat(
    inputFormat: ImageFormat,
    options: OutputFormatOptions,
): ImageOutputFormat | null {
    const mode = options.mode ?? 'original';

    if (mode === 'format') {
        return options.format ?? null;
    }

    if (mode === 'auto') {
        return 'webp';
    }

    switch (inputFormat) {
        case 'jpeg':
        case 'png':
        case 'webp':
            return inputFormat;

        case 'heic':
        case 'heif':
            return null;
    }
}