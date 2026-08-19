import { describe, expect, it } from 'vitest';

import {
    getOutputFileName,
    getOutputMimeType,
} from '../src/output-file';

describe('output file metadata', () => {
    it.each([
        ['jpeg', 'image/jpeg'],
        ['png', 'image/png'],
        ['webp', 'image/webp'],
    ] as const)(
        'returns the MIME type for %s',
        (format, expectedMimeType) => {
            expect(
                getOutputMimeType(format),
            ).toBe(expectedMimeType);
        },
    );

    it.each([
        ['photo.jpg', 'webp', 'photo.webp'],
        ['photo.jpeg', 'png', 'photo.png'],
        ['photo.png', 'jpeg', 'photo.jpg'],
        ['photo.webp', 'jpeg', 'photo.jpg'],
        ['photo.heic', 'webp', 'photo.webp'],
        ['photo.heif', 'png', 'photo.png'],
    ] as const)(
        'converts %s to %s',
        (fileName, format, expectedFileName) => {
            expect(
                getOutputFileName(
                    fileName,
                    format,
                ),
            ).toBe(expectedFileName);
        },
    );

    it('adds an extension when the input file has none', () => {
        expect(
            getOutputFileName(
                'photo',
                'webp',
            ),
        ).toBe('photo.webp');
    });

    it('preserves leading dots in file names', () => {
        expect(
            getOutputFileName(
                '.photo',
                'webp',
            ),
        ).toBe('.photo.webp');
    });
});