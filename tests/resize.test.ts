import { describe, expect, it } from 'vitest';

import { calculateResizeDimensions } from '../src/resize';

describe('calculateResizeDimensions', () => {
    it('preserves the aspect ratio when both limits are set', () => {
        expect(
            calculateResizeDimensions(
                {
                    width: 4032,
                    height: 3024,
                },
                {
                    maxWidth: 1920,
                    maxHeight: 1920,
                },
            ),
        ).toEqual({
            width: 1920,
            height: 1440,
        });
    });

    it('supports maxWidth without maxHeight', () => {
        expect(
            calculateResizeDimensions(
                {
                    width: 4000,
                    height: 3000,
                },
                {
                    maxWidth: 2000,
                },
            ),
        ).toEqual({
            width: 2000,
            height: 1500,
        });
    });

    it('supports maxHeight without maxWidth', () => {
        expect(
            calculateResizeDimensions(
                {
                    width: 4000,
                    height: 3000,
                },
                {
                    maxHeight: 1500,
                },
            ),
        ).toEqual({
            width: 2000,
            height: 1500,
        });
    });

    it('does not upscale smaller images', () => {
        expect(
            calculateResizeDimensions(
                {
                    width: 800,
                    height: 600,
                },
                {
                    maxWidth: 1920,
                    maxHeight: 1920,
                },
            ),
        ).toEqual({
            width: 800,
            height: 600,
        });
    });
});