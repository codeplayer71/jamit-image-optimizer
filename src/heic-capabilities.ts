type HeicCapabilityResult = {
    mimeType: string;
    createImageBitmap: {
        available: boolean;
        supported: boolean;
        width?: number;
        height?: number;
        error?: string;
    };
    imageDecoder: {
        available: boolean;
        supported: boolean;
        error?: string;
    };
};

type ImageDecoderConstructor = {
    isTypeSupported?: (
        type: string,
    ) => Promise<boolean>;
};

export async function probeHeicCapabilities(
    file: File,
): Promise<HeicCapabilityResult> {
    const result: HeicCapabilityResult = {
        mimeType: file.type,
        createImageBitmap: {
            available:
                typeof globalThis.createImageBitmap === 'function',
            supported: false,
        },
        imageDecoder: {
            available: false,
            supported: false,
        },
    };

    if (result.createImageBitmap.available) {
        try {
            const bitmap =
                await createImageBitmap(file);

            result.createImageBitmap = {
                available: true,
                supported: true,
                width: bitmap.width,
                height: bitmap.height,
            };

            bitmap.close();
        } catch (error) {
            result.createImageBitmap.error =
                getErrorMessage(error);
        }
    }

    const imageDecoder = (
        globalThis as typeof globalThis & {
            ImageDecoder?: ImageDecoderConstructor;
        }
    ).ImageDecoder;

    if (imageDecoder) {
        result.imageDecoder.available = true;

        try {
            result.imageDecoder.supported =
                await imageDecoder.isTypeSupported?.(
                    file.type,
                ) ?? false;
        } catch (error) {
            result.imageDecoder.error =
                getErrorMessage(error);
        }
    }

    return result;
}

function getErrorMessage(error: unknown): string {
    return error instanceof Error
        ? error.message
        : String(error);
}