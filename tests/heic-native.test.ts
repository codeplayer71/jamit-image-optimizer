import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import {
    tryDecodeHeicNative,
    tryDecodeHeicWithImageBitmap,
    tryDecodeHeicWithImageDecoder,
} from '../src/heic-native';

describe('HEIC native decoding', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('returns image data when native decoding succeeds', async () => {
        const close = vi.fn();

        vi.stubGlobal(
            'createImageBitmap',
            vi.fn().mockResolvedValue({
                width: 100,
                height: 50,
                close,
            }),
        );

        const imageData = {
            width: 100,
            height: 50,
            data: new Uint8ClampedArray(100 * 50 * 4),
            colorSpace: 'srgb',
        } as ImageData;

        class OffscreenCanvasMock {
            constructor(
                readonly width: number,
                readonly height: number,
            ) {}

            getContext(): {
                drawImage: ReturnType<typeof vi.fn>;
                getImageData: ReturnType<typeof vi.fn>;
            } {
                return {
                    drawImage: vi.fn(),
                    getImageData: vi
                        .fn()
                        .mockReturnValue(imageData),
                };
            }
        }

        vi.stubGlobal(
            'OffscreenCanvas',
            OffscreenCanvasMock,
        );

        const result =
            await tryDecodeHeicWithImageBitmap(
                new ArrayBuffer(4),
                'image/heic',
            );

        expect(result).toBe(imageData);
        expect(close).toHaveBeenCalledOnce();
    });

    it('returns null when native HEIC decoding fails', async () => {
        vi.stubGlobal(
            'createImageBitmap',
            vi.fn().mockRejectedValue(
                new Error(
                    'The source image could not be decoded.',
                ),
            ),
        );

        vi.stubGlobal(
            'OffscreenCanvas',
            class {},
        );

        const result =
            await tryDecodeHeicWithImageBitmap(
                new ArrayBuffer(4),
                'image/heif',
            );

        expect(result).toBeNull();
    });

    it('returns null when required browser APIs are unavailable', async () => {
        const result =
            await tryDecodeHeicWithImageBitmap(
                new ArrayBuffer(4),
                'image/heic',
            );

        expect(result).toBeNull();
    });

    it('returns image data when ImageDecoder decoding succeeds', async () => {
        const frameClose = vi.fn();
        const decoderClose = vi.fn();

        const imageData = {
            width: 100,
            height: 50,
            data: new Uint8ClampedArray(
                100 * 50 * 4,
            ),
            colorSpace: 'srgb',
        } as ImageData;

        class ImageDecoderMock {
            static isTypeSupported = vi
                .fn()
                .mockResolvedValue(true);

            async decode(): Promise<{
                image: {
                    displayWidth: number;
                    displayHeight: number;
                    close: () => void;
                };
                complete: boolean;
            }> {
                return {
                    image: {
                        displayWidth: 100,
                        displayHeight: 50,
                        close: frameClose,
                    },
                    complete: true,
                };
            }

            close(): void {
                decoderClose();
            }
        }

        vi.stubGlobal(
            'ImageDecoder',
            ImageDecoderMock,
        );

        vi.stubGlobal(
            'OffscreenCanvas',
            class {
                getContext(): {
                    drawImage: ReturnType<typeof vi.fn>;
                    getImageData: ReturnType<typeof vi.fn>;
                } {
                    return {
                        drawImage: vi.fn(),
                        getImageData: vi
                            .fn()
                            .mockReturnValue(imageData),
                    };
                }
            },
        );

        const result =
            await tryDecodeHeicWithImageDecoder(
                new ArrayBuffer(4),
                'image/heic',
            );

        expect(result).toBe(imageData);
        expect(frameClose).toHaveBeenCalledOnce();
        expect(decoderClose).toHaveBeenCalledOnce();
    });

    it('returns null when ImageDecoder does not support HEIC', async () => {
        vi.stubGlobal(
            'ImageDecoder',
            class {
                static isTypeSupported = vi
                    .fn()
                    .mockResolvedValue(false);
            },
        );

        vi.stubGlobal(
            'OffscreenCanvas',
            class {},
        );

        const result =
            await tryDecodeHeicWithImageDecoder(
                new ArrayBuffer(4),
                'image/heif',
            );

        expect(result).toBeNull();
    });

    it('prefers createImageBitmap when it can decode HEIC', async () => {
        const bitmapClose = vi.fn();

        const imageData = {
            width: 100,
            height: 50,
            data: new Uint8ClampedArray(
                100 * 50 * 4,
            ),
            colorSpace: 'srgb',
        } as ImageData;

        vi.stubGlobal(
            'createImageBitmap',
            vi.fn().mockResolvedValue({
                width: 100,
                height: 50,
                close: bitmapClose,
            }),
        );

        const imageDecoderSupport = vi.fn();

        vi.stubGlobal(
            'ImageDecoder',
            {
                isTypeSupported: imageDecoderSupport,
            },
        );

        vi.stubGlobal(
            'OffscreenCanvas',
            class {
                getContext(): {
                    drawImage: ReturnType<typeof vi.fn>;
                    getImageData: ReturnType<typeof vi.fn>;
                } {
                    return {
                        drawImage: vi.fn(),
                        getImageData: vi
                            .fn()
                            .mockReturnValue(imageData),
                    };
                }
            },
        );

        const result = await tryDecodeHeicNative(
            new ArrayBuffer(4),
            'image/heic',
        );

        expect(result).toBe(imageData);
        expect(bitmapClose).toHaveBeenCalledOnce();
        expect(imageDecoderSupport).not.toHaveBeenCalled();
    });

    it('falls back to ImageDecoder when createImageBitmap cannot decode HEIC', async () => {
        const frameClose = vi.fn();
        const decoderClose = vi.fn();

        const imageData = {
            width: 100,
            height: 50,
            data: new Uint8ClampedArray(
                100 * 50 * 4,
            ),
            colorSpace: 'srgb',
        } as ImageData;

        vi.stubGlobal(
            'createImageBitmap',
            vi.fn().mockRejectedValue(
                new Error(
                    'The source image could not be decoded.',
                ),
            ),
        );

        class ImageDecoderMock {
            static isTypeSupported = vi
                .fn()
                .mockResolvedValue(true);

            async decode(): Promise<{
                image: {
                    displayWidth: number;
                    displayHeight: number;
                    close: () => void;
                };
                complete: boolean;
            }> {
                return {
                    image: {
                        displayWidth: 100,
                        displayHeight: 50,
                        close: frameClose,
                    },
                    complete: true,
                };
            }

            close(): void {
                decoderClose();
            }
        }

        vi.stubGlobal(
            'ImageDecoder',
            ImageDecoderMock,
        );

        vi.stubGlobal(
            'OffscreenCanvas',
            class {
                getContext(): {
                    drawImage: ReturnType<typeof vi.fn>;
                    getImageData: ReturnType<typeof vi.fn>;
                } {
                    return {
                        drawImage: vi.fn(),
                        getImageData: vi
                            .fn()
                            .mockReturnValue(imageData),
                    };
                }
            },
        );

        const result = await tryDecodeHeicNative(
            new ArrayBuffer(4),
            'image/heif',
        );

        expect(result).toBe(imageData);
        expect(frameClose).toHaveBeenCalledOnce();
        expect(decoderClose).toHaveBeenCalledOnce();
    });
});