import { describe, expect, it, vi } from 'vitest';

vi.mock('@jsquash/jpeg', () => ({
    encode: vi.fn().mockResolvedValue(
        new ArrayBuffer(100),
    ),
}));

vi.mock('@jsquash/png', () => ({
    encode: vi.fn().mockResolvedValue(
        new ArrayBuffer(120),
    ),
}));

vi.mock('@jsquash/webp', () => ({
    encode: vi.fn().mockResolvedValue(
        new ArrayBuffer(80),
    ),
}));

import {
    encode as encodeJpeg,
} from '@jsquash/jpeg';
import {
    encode as encodePng,
} from '@jsquash/png';
import {
    encode as encodeWebP,
} from '@jsquash/webp';

import { encodeImage } from '../src/image-encoder';

const imageData = {
    width: 100,
    height: 50,
    data: new Uint8ClampedArray(
        100 * 50 * 4,
    ),
    colorSpace: 'srgb',
} as ImageData;

describe('encodeImage', () => {
    it('encodes JPEG with quality metadata', async () => {
        const result = await encodeImage({
            format: 'jpeg',
            imageData,
            quality: 80,
        });

        expect(encodeJpeg).toHaveBeenCalledWith(
            imageData,
            {
                quality: 80,
            },
        );

        expect(result).toEqual({
            buffer: expect.any(ArrayBuffer),
            finalQuality: 80,
            encodeAttempts: 1,
        });
    });

    it('encodes WebP with quality metadata', async () => {
        const result = await encodeImage({
            format: 'webp',
            imageData,
            quality: 85,
        });

        expect(encodeWebP).toHaveBeenCalledWith(
            imageData,
            {
                quality: 85,
            },
        );

        expect(result).toEqual({
            buffer: expect.any(ArrayBuffer),
            finalQuality: 85,
            encodeAttempts: 1,
        });
    });

    it('encodes PNG without quality metadata', async () => {
        const result = await encodeImage({
            format: 'png',
            imageData,
            quality: 80,
        });

        expect(encodePng).toHaveBeenCalledWith(
            imageData,
        );

        expect(result).toEqual({
            buffer: expect.any(ArrayBuffer),
            encodeAttempts: 1,
        });
    });
});