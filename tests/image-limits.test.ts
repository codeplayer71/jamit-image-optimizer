import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    DEFAULT_MAX_INPUT_BYTES,
    DEFAULT_MAX_PIXELS,
    exceedsInputByteLimit,
    exceedsPixelLimit,
    resolveImageProcessingLimits,
} from '../src/image-limits';

describe('image processing limits', () => {
    it('uses the default limits', () => {
        expect(
            resolveImageProcessingLimits(),
        ).toEqual({
            maxInputBytes:
            DEFAULT_MAX_INPUT_BYTES,
            maxPixels:
            DEFAULT_MAX_PIXELS,
        });
    });

    it('allows custom limits', () => {
        expect(
            resolveImageProcessingLimits({
                maxInputBytes: 10_000,
                maxPixels: 5_000_000,
            }),
        ).toEqual({
            maxInputBytes: 10_000,
            maxPixels: 5_000_000,
        });
    });

    it('rejects invalid limits', () => {
        expect(() =>
            resolveImageProcessingLimits({
                maxInputBytes: 0,
            }),
        ).toThrow(RangeError);

        expect(() =>
            resolveImageProcessingLimits({
                maxPixels: -1,
            }),
        ).toThrow(RangeError);
    });

    it('detects files above the byte limit', () => {
        const limits =
            resolveImageProcessingLimits({
                maxInputBytes: 1_000,
            });

        expect(
            exceedsInputByteLimit(
                1_000,
                limits,
            ),
        ).toBe(false);

        expect(
            exceedsInputByteLimit(
                1_001,
                limits,
            ),
        ).toBe(true);
    });

    it('detects images above the pixel limit', () => {
        const limits =
            resolveImageProcessingLimits({
                maxPixels: 1_000_000,
            });

        expect(
            exceedsPixelLimit(
                1_000,
                1_000,
                limits,
            ),
        ).toBe(false);

        expect(
            exceedsPixelLimit(
                2_000,
                1_000,
                limits,
            ),
        ).toBe(true);
    });
});