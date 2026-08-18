import { describe, expect, it } from 'vitest';

describe('SSR import', () => {
    it('can import the package without browser APIs', async () => {
        const module = await import('../src');

        expect(module.optimizeImage).toBeTypeOf('function');
    });

    it('rejects image processing outside the browser', async () => {
        const { optimizeImage } = await import('../src');

        await expect(
            optimizeImage(
                {
                    type: 'image/jpeg',
                } as File,
            )
        ).rejects.toThrow('Image optimization requires a browser environment.');
    });
});