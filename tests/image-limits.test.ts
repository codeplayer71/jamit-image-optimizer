import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    DEFAULT_MAX_DIMENSION,
    DEFAULT_MAX_INPUT_BYTES,
    DEFAULT_MAX_PIXELS,
    exceedsDimensionLimit,
    exceedsInputByteLimit,
    exceedsPixelLimit,
    resolveImageProcessingLimits,
} from '../src/image-limits';

describe('image processing limits', () => {
    it('uses the documented default limits', () => {
        expect(
            resolveImageProcessingLimits(),
        ).toEqual({
            maxInputBytes: 52_428_800,
            maxPixels: 25_000_000,
            maxDimension: 16_384,
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
            maxDimension:
            DEFAULT_MAX_DIMENSION,
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

    it('allows overriding the maximum dimension', () => {
        expect(
            resolveImageProcessingLimits({
                maxDimension: 8_192,
            }),
        ).toMatchObject({
            maxDimension: 8_192,
        });
    });

    it.each([
        0,
        -1,
        1.5,
        Number.NaN,
        Number.POSITIVE_INFINITY,
    ])(
        'rejects invalid maxDimension value %s',
        (maxDimension) => {
            expect(() =>
                resolveImageProcessingLimits({
                    maxDimension,
                }),
            ).toThrow(RangeError);
        },
    );

    it('detects images above the dimension limit', () => {
        const limits =
            resolveImageProcessingLimits({
                maxDimension: 8_192,
            });

        expect(
            exceedsDimensionLimit(
                8_192,
                4_000,
                limits,
            ),
        ).toBe(false);

        expect(
            exceedsDimensionLimit(
                8_193,
                4_000,
                limits,
            ),
        ).toBe(true);

        expect(
            exceedsDimensionLimit(
                4_000,
                8_193,
                limits,
            ),
        ).toBe(true);
    });
});