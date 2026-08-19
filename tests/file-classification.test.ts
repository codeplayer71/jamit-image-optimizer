import { describe, expect, it } from 'vitest';

import { classifyFile } from '../src/file-classification';

describe('classifyFile', () => {
    it('classifies JPEG as a supported image', () => {
        const file = new File([], 'photo.jpg', {
            type: 'image/jpeg',
        });

        expect(classifyFile(file)).toBe('supported-image');
    });

    it.each([
        'image/heic',
        'image/heif',
        'image/gif',
        'image/svg+xml',
    ])('classifies %s as an unsupported image', (type) => {
        const file = new File([], 'image', {
            type,
        });

        expect(classifyFile(file)).toBe('unsupported-image');
    });

    it.each([
        'application/pdf',
        'video/mp4',
        'text/plain',
    ])('classifies %s as passthrough', (type) => {
        const file = new File([], 'file', {
            type,
        });

        expect(classifyFile(file)).toBe('passthrough');
    });

    it('treats an empty MIME type conservatively as passthrough', () => {
        const file = new File([], 'unknown');

        expect(classifyFile(file)).toBe('passthrough');
    });

    it('classifies PNG as a supported image', () => {
        const file = new File([], 'photo.png', {
            type: 'image/png',
        });

        expect(classifyFile(file)).toBe('supported-image');
    });

    it('classifies WebP as a supported image', () => {
        const file = new File([], 'photo.webp', {
            type: 'image/webp',
        });

        expect(classifyFile(file)).toBe('supported-image');
    });
});