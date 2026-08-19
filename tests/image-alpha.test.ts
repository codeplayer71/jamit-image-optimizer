import { describe, expect, it } from 'vitest';

import { hasTransparency } from '../src/image-alpha';

function createImageData(
    alphaValues: number[],
): ImageData {
    const data = new Uint8ClampedArray(
        alphaValues.length * 4,
    );

    alphaValues.forEach((alpha, index) => {
        data[index * 4] = 100;
        data[index * 4 + 1] = 150;
        data[index * 4 + 2] = 200;
        data[index * 4 + 3] = alpha;
    });

    return {
        width: alphaValues.length,
        height: 1,
        data,
        colorSpace: 'srgb',
    } as ImageData;
}

describe('hasTransparency', () => {
    it('returns false for fully opaque image data', () => {
        expect(
            hasTransparency(
                createImageData([
                    255,
                    255,
                    255,
                ]),
            ),
        ).toBe(false);
    });

    it('returns true when a pixel is fully transparent', () => {
        expect(
            hasTransparency(
                createImageData([
                    255,
                    0,
                    255,
                ]),
            ),
        ).toBe(true);
    });

    it('returns true when a pixel is partially transparent', () => {
        expect(
            hasTransparency(
                createImageData([
                    255,
                    128,
                    255,
                ]),
            ),
        ).toBe(true);
    });
});