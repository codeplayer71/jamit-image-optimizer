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
                type: 'image/gif',
            } as File,
        );

        await expect(promise).rejects.toThrow(ImageOptimizerError);
        await expect(promise).rejects.toMatchObject({
            code: 'unsupported-format',
        });
    });

    it('rejects when the signal is already aborted', async () => {
        const controller = new AbortController();
        controller.abort();

        const promise = optimizeImage(
            {
                type: 'image/jpeg',
            } as File,
            {
                signal: controller.signal,
            },
        );

        await expect(promise).rejects.toThrow(ImageOptimizerError);
        await expect(promise).rejects.toMatchObject({
            code: 'aborted',
        });
    });

    it.each([
        0,
        -1,
        1.5,
        Number.NaN,
        Number.POSITIVE_INFINITY,
    ])('rejects invalid targetSize value %s', async (targetSize) => {
        const promise = optimizeImage(
            {
                type: 'image/jpeg',
            } as File,
            { targetSize },
        );

        await expect(promise).rejects.toMatchObject({
            code: 'invalid-options',
        });
    });

    it.each([
        0,
        -0.1,
        1.1,
        Number.NaN,
        Number.POSITIVE_INFINITY,
    ])('rejects invalid minQuality value %s', async (minQuality) => {
        const promise = optimizeImage(
            {
                type: 'image/jpeg',
            } as File,
            { minQuality },
        );

        await expect(promise).rejects.toMatchObject({
            code: 'invalid-options',
        });
    });

    it('rejects minQuality greater than quality', async () => {
        const promise = optimizeImage(
            {
                type: 'image/jpeg',
            } as File,
            {
                quality: 0.7,
                minQuality: 0.8,
            },
        );

        await expect(promise).rejects.toMatchObject({
            code: 'invalid-options',
        });
    });

    it('requires a format when mode is format', async () => {
        const file = new File(
            [new Uint8Array(4)],
            'image.jpg',
            {
                type: 'image/jpeg',
            },
        );

        await expect(
            optimizeImage(file, {
                mode: 'format',
            }),
        ).rejects.toMatchObject({
            code: 'invalid-options',
        });
    });

    it('rejects format when mode is original', async () => {
        const file = new File(
            [new Uint8Array(4)],
            'image.jpg',
            {
                type: 'image/jpeg',
            },
        );

        await expect(
            optimizeImage(file, {
                mode: 'original',
                format: 'webp',
            }),
        ).rejects.toMatchObject({
            code: 'invalid-options',
        });
    });

    it('rejects format when mode is auto', async () => {
        const file = new File(
            [new Uint8Array(4)],
            'photo.jpg',
            {
                type: 'image/jpeg',
            },
        );

        await expect(
            optimizeImage(file, {
                mode: 'auto',
                format: 'webp',
            }),
        ).rejects.toMatchObject({
            code: 'invalid-options',
        });
    });
});