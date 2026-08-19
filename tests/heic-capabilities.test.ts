import { afterEach, describe, expect, it, vi } from 'vitest';

import { probeHeicCapabilities } from '../src/heic-capabilities';

describe('probeHeicCapabilities', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('reports native image decoding support', async () => {
        const close = vi.fn();

        vi.stubGlobal(
            'createImageBitmap',
            vi.fn().mockResolvedValue({
                width: 1200,
                height: 800,
                close,
            }),
        );

        vi.stubGlobal('ImageDecoder', {
            isTypeSupported: vi.fn().mockResolvedValue(true),
        });

        const file = new File(
            [new Uint8Array(4)],
            'photo.heic',
            {
                type: 'image/heic',
            },
        );

        const result = await probeHeicCapabilities(file);

        expect(result.mimeType).toBe('image/heic');

        expect(result.createImageBitmap).toMatchObject({
            available: true,
            supported: true,
            width: 1200,
            height: 800,
        });

        expect(result.imageDecoder).toMatchObject({
            available: true,
            supported: true,
        });

        expect(close).toHaveBeenCalledOnce();
    });

    it('reports unavailable native decoding capabilities', async () => {
        const file = new File(
            [new Uint8Array(4)],
            'photo.heif',
            {
                type: 'image/heif',
            },
        );

        const result = await probeHeicCapabilities(file);

        expect(result.mimeType).toBe('image/heif');

        expect(result.createImageBitmap).toMatchObject({
            available: false,
            supported: false,
        });

        expect(result.imageDecoder).toMatchObject({
            available: false,
            supported: false,
        });
    });
});