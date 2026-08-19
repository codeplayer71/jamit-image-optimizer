import { describe, expect, it } from 'vitest';

import { resolveOutputFormat } from '../src/output-format';

describe('resolveOutputFormat', () => {
    it.each([
        ['jpeg', 'jpeg'],
        ['png', 'png'],
        ['webp', 'webp'],
    ] as const)(
        'keeps %s when using original mode',
        (inputFormat, expectedFormat) => {
            expect(
                resolveOutputFormat(inputFormat, {
                    mode: 'original',
                }),
            ).toBe(expectedFormat);
        },
    );

    it('uses original mode by default', () => {
        expect(
            resolveOutputFormat('jpeg', {}),
        ).toBe('jpeg');
    });

    it.each([
        'jpeg',
        'png',
        'webp',
        'heic',
        'heif',
    ] as const)(
        'uses the requested output format for %s input',
        (inputFormat) => {
            expect(
                resolveOutputFormat(inputFormat, {
                    mode: 'format',
                    format: 'webp',
                }),
            ).toBe('webp');
        },
    );

    it.each([
        'heic',
        'heif',
    ] as const)(
        'returns null for %s in original mode',
        (inputFormat) => {
            expect(
                resolveOutputFormat(inputFormat, {
                    mode: 'original',
                }),
            ).toBeNull();
        },
    );
});