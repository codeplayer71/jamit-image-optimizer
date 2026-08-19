export const DEFAULT_MAX_INPUT_BYTES =
    50 * 1024 * 1024;

export const DEFAULT_MAX_PIXELS =
    25_000_000;

export type ImageProcessingLimits = {
    maxInputBytes?: number;
    maxPixels?: number;
};

export type ResolvedImageProcessingLimits = {
    maxInputBytes: number;
    maxPixels: number;
};

export function resolveImageProcessingLimits(
    limits: ImageProcessingLimits = {},
): ResolvedImageProcessingLimits {
    const maxInputBytes =
        limits.maxInputBytes ??
        DEFAULT_MAX_INPUT_BYTES;

    const maxPixels =
        limits.maxPixels ??
        DEFAULT_MAX_PIXELS;

    if (
        !Number.isSafeInteger(maxInputBytes) ||
        maxInputBytes <= 0
    ) {
        throw new RangeError(
            'maxInputBytes must be a positive integer.',
        );
    }

    if (
        !Number.isSafeInteger(maxPixels) ||
        maxPixels <= 0
    ) {
        throw new RangeError(
            'maxPixels must be a positive integer.',
        );
    }

    return {
        maxInputBytes,
        maxPixels,
    };
}

export function exceedsInputByteLimit(
    size: number,
    limits: ResolvedImageProcessingLimits,
): boolean {
    return size > limits.maxInputBytes;
}

export function exceedsPixelLimit(
    width: number,
    height: number,
    limits: ResolvedImageProcessingLimits,
): boolean {
    return (
        width > 0 &&
        height > 0 &&
        width * height > limits.maxPixels
    );
}