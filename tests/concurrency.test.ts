import { describe, expect, it } from 'vitest';

import { mapWithConcurrency } from '../src/concurrency';

describe('mapWithConcurrency', () => {
    it('preserves result order when jobs finish out of order', async () => {
        const result = await mapWithConcurrency(
            [30, 10, 20],
            3,
            async (delay, index) => {
                await new Promise((resolve) => {
                    setTimeout(resolve, delay);
                });

                return index;
            },
        );

        expect(result).toEqual([0, 1, 2]);
    });

    it('never exceeds the configured concurrency', async () => {
        let activeJobs = 0;
        let maxActiveJobs = 0;

        await mapWithConcurrency(
            [1, 2, 3, 4, 5],
            2,
            async (value) => {
                activeJobs += 1;
                maxActiveJobs = Math.max(maxActiveJobs, activeJobs);

                await new Promise((resolve) => {
                    setTimeout(resolve, 10);
                });

                activeJobs -= 1;

                return value;
            },
        );

        expect(maxActiveJobs).toBe(2);
    });

    it('handles an empty input', async () => {
        const result = await mapWithConcurrency(
            [],
            2,
            async (value) => value,
        );

        expect(result).toEqual([]);
    });
});