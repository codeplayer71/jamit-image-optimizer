import { describe, expect, it } from 'vitest';

import {
    ImageOptimizerError,
    optimizeImage,
} from '../src';

describe('optimizeImage options', () => {
    it.each([
        { maxWidth: 0 },
        { maxWidth: -1 },
        { maxWidth: Number.NaN },
        { maxWidth: Number.POSITIVE_INFINITY },
        { maxHeight: 0 },
        { maxHeight: -1 },
        { maxHeight: Number.NaN },
        { maxHeight: Number.POSITIVE_INFINITY },
    ])('rejects invalid resize options %o', async (resize) => {
        const promise = optimizeImage(
            {
                type: 'image/jpeg',
            } as File,
            { resize },
        );

        await expect(promise).rejects.toThrow(ImageOptimizerError);
        await expect(promise).rejects.toMatchObject({
            code: 'invalid-options',
        });
    });

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