export const DEFAULT_MAX_INPUT_BYTES =
    50 * 1024 * 1024;

export const DEFAULT_MAX_PIXELS =
    25_000_000;

export const DEFAULT_MAX_DIMENSION =
    16_384;

export type ImageProcessingLimits = {
    maxInputBytes?: number;
    maxPixels?: number;
    maxDimension?: number;
};

export type ResolvedImageProcessingLimits = {
    maxInputBytes: number;
    maxPixels: number;
    maxDimension: number;
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

    const maxDimension =
        limits.maxDimension ??
        DEFAULT_MAX_DIMENSION;

    validatePositiveSafeInteger(
        maxInputBytes,
        'maxInputBytes',
    );

    validatePositiveSafeInteger(
        maxPixels,
        'maxPixels',
    );

    validatePositiveSafeInteger(
        maxDimension,
        'maxDimension',
    );

    return {
        maxInputBytes,
        maxPixels,
        maxDimension,
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
        width * height >
        limits.maxPixels
    );
}

export function exceedsDimensionLimit(
    width: number,
    height: number,
    limits: ResolvedImageProcessingLimits,
): boolean {
    return (
        width > limits.maxDimension ||
        height > limits.maxDimension
    );
}

function validatePositiveSafeInteger(
    value: number,
    name: string,
): void {
    if (
        !Number.isSafeInteger(value) ||
        value <= 0
    ) {
        throw new RangeError(
            `${name} must be a positive integer.`,
        );
    }
}