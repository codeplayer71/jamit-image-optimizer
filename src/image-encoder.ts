import { encode as encodeJpeg } from '@jsquash/jpeg';
import { encode as encodePng } from '@jsquash/png';
import { encode as encodeWebP } from '@jsquash/webp';

import { searchTargetSize } from './target-size';
import type { ImageOutputFormat } from './types';

type EncodeImageOptions = {
    format: ImageOutputFormat;
    imageData: ImageData;
    quality: number;
    targetSize?: number;
    minQuality?: number;
};

export type EncodeImageResult = {
    buffer: ArrayBuffer;
    finalQuality?: number;
    encodeAttempts: number;
    targetReached?: boolean;
};

const DEFAULT_MIN_QUALITY = 50;
const MAX_ENCODE_ATTEMPTS = 6;

export async function encodeImage(
    options: EncodeImageOptions,
): Promise<EncodeImageResult> {
    if (options.format === 'png') {
        const buffer = await encodePng(
            options.imageData,
        );

        return {
            buffer,
            encodeAttempts: 1,
        };
    }

    const encode =
        options.format === 'jpeg'
            ? encodeJpeg
            : encodeWebP;

    if (options.targetSize === undefined) {
        const buffer = await encode(
            options.imageData,
            {
                quality: options.quality,
            },
        );

        return {
            buffer,
            finalQuality: options.quality,
            encodeAttempts: 1,
        };
    }

    const searchResult = await searchTargetSize({
        targetSize: options.targetSize,
        initialQuality: options.quality,
        minQuality:
            options.minQuality ??
            DEFAULT_MIN_QUALITY,
        maxAttempts: MAX_ENCODE_ATTEMPTS,
        encode: async (quality) => {
            const buffer = await encode(
                options.imageData,
                {
                    quality,
                },
            );

            return {
                value: buffer,
                size: buffer.byteLength,
            };
        },
    });

    return {
        buffer: searchResult.value,
        finalQuality: searchResult.quality,
        encodeAttempts: searchResult.attempts,
        targetReached: searchResult.targetReached,
    };
}