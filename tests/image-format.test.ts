import { describe, expect, it } from 'vitest';

import { getImageFormat } from '../src/image-format';

describe('getImageFormat', () => {
    it.each([
        ['image/jpeg', 'jpeg'],
        ['image/png', 'png'],
        ['image/webp', 'webp'],
        ['image/heic', 'heic'],
        ['image/heif', 'heif'],
    ] as const)('maps %s to %s', (type, expectedFormat) => {
        const file = new File([], 'image', {
            type,
        });

        expect(getImageFormat(file)).toBe(expectedFormat);
    });

    it('returns null for unsupported image MIME types', () => {
        const file = new File([], 'image.gif', {
            type: 'image/gif',
        });

        expect(getImageFormat(file)).toBeNull();
    });

    it('returns null for an empty MIME type', () => {
        const file = new File([], 'unknown');

        expect(getImageFormat(file)).toBeNull();
    });
});