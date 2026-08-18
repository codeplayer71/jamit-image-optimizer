import type { ImageResizeOptions } from './types';

export type ImageDimensions = {
    width: number;
    height: number;
};

export function calculateResizeDimensions(
    dimensions: ImageDimensions,
    options: ImageResizeOptions,
): ImageDimensions {
    const widthRatio = options.maxWidth
        ? options.maxWidth / dimensions.width
        : 1;

    const heightRatio = options.maxHeight
        ? options.maxHeight / dimensions.height
        : 1;

    const scale = Math.min(widthRatio, heightRatio, 1);

    return {
        width: Math.round(dimensions.width * scale),
        height: Math.round(dimensions.height * scale),
    };
}