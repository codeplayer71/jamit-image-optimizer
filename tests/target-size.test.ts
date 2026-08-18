import { describe, expect, it, vi } from 'vitest';

import { searchTargetSize } from '../src/target-size';

describe('searchTargetSize', () => {
    it('keeps the initial quality when it already reaches the target', async () => {
        const encode = vi.fn(async (quality: number) => ({
            value: quality,
            size: 600,
        }));

        const result = await searchTargetSize({
            targetSize: 700,
            initialQuality: 0.8,
            minQuality: 0.5,
            maxAttempts: 6,
            encode,
        });

        expect(result.quality).toBe(0.8);
        expect(result.attempts).toBe(1);
        expect(result.targetReached).toBe(true);
        expect(encode).toHaveBeenCalledOnce();
    });

    it('returns minQuality when the target cannot be reached', async () => {
        const result = await searchTargetSize({
            targetSize: 400,
            initialQuality: 0.8,
            minQuality: 0.5,
            maxAttempts: 6,
            encode: async (quality) => ({
                value: quality,
                size: quality === 0.5 ? 500 : 800,
            }),
        });

        expect(result.quality).toBe(0.5);
        expect(result.size).toBe(500);
        expect(result.attempts).toBe(2);
        expect(result.targetReached).toBe(false);
    });

    it('searches for the highest quality that reaches the target', async () => {
        const result = await searchTargetSize({
            targetSize: 700,
            initialQuality: 0.9,
            minQuality: 0.5,
            maxAttempts: 6,
            encode: async (quality) => ({
                value: quality,
                size: Math.round(quality * 1000),
            }),
        });

        expect(result.quality).toBe(0.7);
        expect(result.size).toBe(700);
        expect(result.attempts).toBe(6);
        expect(result.targetReached).toBe(true);
    });
});