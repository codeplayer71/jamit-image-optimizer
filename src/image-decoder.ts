import decodeJpeg from '@jsquash/jpeg/decode.js';
import decodePng from '@jsquash/png/decode.js';
import decodeWebP from '@jsquash/webp/decode.js';

import { ImageOptimizerError } from './errors';
import {
    tryDecodeHeicNative,
    type HeicMimeType,
} from './heic-native';
import type { ImageFormat } from './image-format';
import { isAnimatedPng } from './png';
import { isAnimatedWebP } from './webp';

export type DecodableImageFormat = ImageFormat;

export async function decodeImage(
    buffer: ArrayBuffer,
    format: DecodableImageFormat,
): Promise<ImageData> {
    switch (format) {
        case 'jpeg':
            return decodeJpeg(buffer);

        case 'png':
            if (isAnimatedPng(buffer)) {
                throw new ImageOptimizerError(
                    'unsupported-format',
                    'Animated PNG images are not supported.',
                );
            }

            return decodePng(buffer);

        case 'webp':
            if (isAnimatedWebP(buffer)) {
                throw new ImageOptimizerError(
                    'unsupported-format',
                    'Animated WebP images are not supported.',
                );
            }

            return decodeWebP(buffer);

        case 'heic':
            return decodeHeicNative(
                buffer,
                'image/heic',
            );

        case 'heif':
            return decodeHeicNative(
                buffer,
                'image/heif',
            );
    }
}

async function decodeHeicNative(
    buffer: ArrayBuffer,
    mimeType: HeicMimeType,
): Promise<ImageData> {
    const imageData = await tryDecodeHeicNative(
        buffer,
        mimeType,
    );

    if (!imageData) {
        throw new ImageOptimizerError(
            'codec-not-supported',
            `Native decoding for "${mimeType}" is not supported by this browser.`,
        );
    }

    return imageData;
}