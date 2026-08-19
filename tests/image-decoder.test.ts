import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

vi.mock('@jsquash/jpeg/decode.js', () => ({
    default: vi.fn(),
}));

vi.mock('@jsquash/png/decode.js', () => ({
    default: vi.fn(),
}));

vi.mock('@jsquash/webp/decode.js', () => ({
    default: vi.fn(),
}));

vi.mock('../src/png', () => ({
    isAnimatedPng: vi.fn(),
}));

vi.mock('../src/webp', () => ({
    isAnimatedWebP: vi.fn(),
}));

vi.mock('../src/heic-native', () => ({
    tryDecodeHeicNative: vi.fn(),
}));

import decodeJpeg from '@jsquash/jpeg/decode.js';
import decodePng from '@jsquash/png/decode.js';
import decodeWebP from '@jsquash/webp/decode.js';

import { tryDecodeHeicNative } from '../src/heic-native';
import { decodeImage } from '../src/image-decoder';
import { isAnimatedPng } from '../src/png';
import { isAnimatedWebP } from '../src/webp';

const imageData = {
    width: 100,
    height: 50,
    data: new Uint8ClampedArray(
        100 * 50 * 4,
    ),
    colorSpace: 'srgb',
} as ImageData;

describe('decodeImage', () => {
    beforeEach(() => {
        vi.mocked(isAnimatedPng).mockReturnValue(false);
        vi.mocked(isAnimatedWebP).mockReturnValue(false);

        vi.mocked(decodeJpeg).mockResolvedValue(imageData);
        vi.mocked(decodePng).mockResolvedValue(imageData);
        vi.mocked(decodeWebP).mockResolvedValue(imageData);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('decodes JPEG images', async () => {
        const buffer = new ArrayBuffer(4);

        const result = await decodeImage(
            buffer,
            'jpeg',
        );

        expect(result).toBe(imageData);
        expect(decodeJpeg).toHaveBeenCalledWith(
            buffer,
            {
                preserveOrientation: true,
            },
        );
    });

    it('decodes static PNG images', async () => {
        const buffer = new ArrayBuffer(4);

        const result = await decodeImage(
            buffer,
            'png',
        );

        expect(result).toBe(imageData);
        expect(isAnimatedPng).toHaveBeenCalledWith(
            buffer,
        );
        expect(decodePng).toHaveBeenCalledWith(
            buffer,
        );
    });

    it('decodes static WebP images', async () => {
        const buffer = new ArrayBuffer(4);

        const result = await decodeImage(
            buffer,
            'webp',
        );

        expect(result).toBe(imageData);
        expect(isAnimatedWebP).toHaveBeenCalledWith(
            buffer,
        );
        expect(decodeWebP).toHaveBeenCalledWith(
            buffer,
        );
    });

    it('rejects animated PNG images before decoding', async () => {
        vi.mocked(isAnimatedPng).mockReturnValue(true);

        const buffer = new ArrayBuffer(4);

        await expect(
            decodeImage(buffer, 'png'),
        ).rejects.toMatchObject({
            code: 'unsupported-format',
        });

        expect(decodePng).not.toHaveBeenCalled();
    });

    it('rejects animated WebP images before decoding', async () => {
        vi.mocked(isAnimatedWebP).mockReturnValue(true);

        const buffer = new ArrayBuffer(4);

        await expect(
            decodeImage(buffer, 'webp'),
        ).rejects.toMatchObject({
            code: 'unsupported-format',
        });

        expect(decodeWebP).not.toHaveBeenCalled();
    });

    it('decodes HEIC through the native decoder', async () => {
        vi.mocked(
            tryDecodeHeicNative,
        ).mockResolvedValue(imageData);

        const buffer = new ArrayBuffer(4);

        await expect(
            decodeImage(
                buffer,
                'heic',
            ),
        ).resolves.toBe(imageData);

        expect(
            tryDecodeHeicNative,
        ).toHaveBeenCalledWith(
            buffer,
            'image/heic',
        );
    });

    it('throws codec-not-supported when HEIC cannot be decoded natively', async () => {
        vi.mocked(
            tryDecodeHeicNative,
        ).mockResolvedValue(null);

        await expect(
            decodeImage(
                new ArrayBuffer(4),
                'heic',
            ),
        ).rejects.toMatchObject({
            name: 'ImageOptimizerError',
            code: 'codec-not-supported',
        });
    });

    it('throws codec-not-supported when HEIF cannot be decoded natively', async () => {
        vi.mocked(
            tryDecodeHeicNative,
        ).mockResolvedValue(null);

        await expect(
            decodeImage(
                new ArrayBuffer(4),
                'heif',
            ),
        ).rejects.toMatchObject({
            name: 'ImageOptimizerError',
            code: 'codec-not-supported',
        });
    });

    it('decodes HEIF through the native decoder', async () => {
        vi.mocked(
            tryDecodeHeicNative,
        ).mockResolvedValue(imageData);

        const buffer = new ArrayBuffer(4);

        await expect(
            decodeImage(
                buffer,
                'heif',
            ),
        ).resolves.toBe(imageData);

        expect(
            tryDecodeHeicNative,
        ).toHaveBeenCalledWith(
            buffer,
            'image/heif',
        );
    });
});