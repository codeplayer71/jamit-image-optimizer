export type HeicMimeType =
    | 'image/heic'
    | 'image/heif';

type NativeVideoFrame = {
    displayWidth: number;
    displayHeight: number;
    close: () => void;
};

type ImageDecoderResult = {
    image: NativeVideoFrame;
    complete: boolean;
};

type ImageDecoderInstance = {
    decode: (options?: {
        frameIndex?: number;
        completeFramesOnly?: boolean;
    }) => Promise<ImageDecoderResult>;
    close: () => void;
};

type ImageDecoderConstructor = {
    new (init: {
        type: string;
        data: ArrayBuffer;
    }): ImageDecoderInstance;

    isTypeSupported: (
        type: string,
    ) => Promise<boolean>;
};

export async function tryDecodeHeicWithImageBitmap(
    buffer: ArrayBuffer,
    mimeType: HeicMimeType,
): Promise<ImageData | null> {
    if (
        typeof globalThis.createImageBitmap !== 'function' ||
        typeof globalThis.OffscreenCanvas === 'undefined'
    ) {
        return null;
    }

    let bitmap: ImageBitmap;

    try {
        const blob = new Blob(
            [buffer],
            {
                type: mimeType,
            },
        );

        bitmap = await createImageBitmap(blob);
    } catch {
        return null;
    }

    try {
        return drawImageSourceToImageData(
            bitmap,
            bitmap.width,
            bitmap.height,
        );
    } finally {
        bitmap.close();
    }
}

export async function tryDecodeHeicWithImageDecoder(
    buffer: ArrayBuffer,
    mimeType: HeicMimeType,
): Promise<ImageData | null> {
    if (
        typeof globalThis.OffscreenCanvas === 'undefined'
    ) {
        return null;
    }

    const ImageDecoder = (
        globalThis as typeof globalThis & {
            ImageDecoder?: ImageDecoderConstructor;
        }
    ).ImageDecoder;

    if (!ImageDecoder) {
        return null;
    }

    try {
        const supported =
            await ImageDecoder.isTypeSupported(
                mimeType,
            );

        if (!supported) {
            return null;
        }
    } catch {
        return null;
    }

    let decoder: ImageDecoderInstance | null = null;
    let frame: NativeVideoFrame | null = null;

    try {
        decoder = new ImageDecoder({
            type: mimeType,
            data: buffer,
        });

        const result = await decoder.decode({
            frameIndex: 0,
            completeFramesOnly: true,
        });

        frame = result.image;

        if (
            frame.displayWidth <= 0 ||
            frame.displayHeight <= 0
        ) {
            return null;
        }

        return drawImageSourceToImageData(
            frame as unknown as CanvasImageSource,
            frame.displayWidth,
            frame.displayHeight,
        );
    } catch {
        return null;
    } finally {
        frame?.close();
        decoder?.close();
    }
}

export async function tryDecodeHeicNative(
    buffer: ArrayBuffer,
    mimeType: HeicMimeType,
): Promise<ImageData | null> {
    const imageBitmapResult =
        await tryDecodeHeicWithImageBitmap(
            buffer,
            mimeType,
        );

    if (imageBitmapResult) {
        return imageBitmapResult;
    }

    return tryDecodeHeicWithImageDecoder(
        buffer,
        mimeType,
    );
}

function drawImageSourceToImageData(
    source: CanvasImageSource,
    width: number,
    height: number,
): ImageData | null {
    const canvas = new OffscreenCanvas(
        width,
        height,
    );

    const context = canvas.getContext('2d');

    if (!context) {
        return null;
    }

    context.drawImage(
        source,
        0,
        0,
    );

    return context.getImageData(
        0,
        0,
        width,
        height,
    );
}