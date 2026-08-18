import { describe, expect, it } from 'vitest';

import {
    ImageOptimizerError,
    optimizeImage,
} from '../src';

describe('optimizeImage options', () => {
    it.each([0, -0.1, 1.1, Number.NaN, Number.POSITIVE_INFINITY])(
        'rejects invalid quality value %s',
        async (quality) => {
            const promise = optimizeImage({} as File, { quality });

            await expect(promise).rejects.toThrow(ImageOptimizerError);
            await expect(promise).rejects.toMatchObject({
                code: 'invalid-options',
            });
        },
    );

    it('rejects unsupported image formats', async () => {
        const promise = optimizeImage(
            {
                type: 'image/png',
            } as File,
        );

        await expect(promise).rejects.toThrow(ImageOptimizerError);
        await expect(promise).rejects.toMatchObject({
            code: 'unsupported-format',
        });
    });
});