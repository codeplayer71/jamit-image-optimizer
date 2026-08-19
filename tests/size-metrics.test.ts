import { describe, expect, it } from 'vitest';

import { calculateSizeMetrics } from '../src/size-metrics';

describe('calculateSizeMetrics', () => {
    it('reports savings when the output is smaller', () => {
        expect(
            calculateSizeMetrics(1_000, 400),
        ).toEqual({
            savings: {
                bytes: 600,
                ratio: 0.6,
                percent: 60,
            },
            sizeChange: {
                bytes: -600,
                ratio: -0.6,
                percent: -60,
            },
        });
    });

    it('does not report negative savings when the output is larger', () => {
        expect(
            calculateSizeMetrics(1_000, 1_200),
        ).toEqual({
            savings: {
                bytes: 0,
                ratio: 0,
                percent: 0,
            },
            sizeChange: {
                bytes: 200,
                ratio: 0.2,
                percent: 20,
            },
        });
    });

    it('reports no size change when both sizes are equal', () => {
        expect(
            calculateSizeMetrics(1_000, 1_000),
        ).toEqual({
            savings: {
                bytes: 0,
                ratio: 0,
                percent: 0,
            },
            sizeChange: {
                bytes: 0,
                ratio: 0,
                percent: 0,
            },
        });
    });

    it('handles an empty original safely', () => {
        expect(
            calculateSizeMetrics(0, 100),
        ).toEqual({
            savings: {
                bytes: 0,
                ratio: 0,
                percent: 0,
            },
            sizeChange: {
                bytes: 100,
                ratio: 0,
                percent: 0,
            },
        });
    });
});