import { decode as decodeJpeg } from '@jsquash/jpeg';
import { decode as decodePng } from '@jsquash/png';
import { decode as decodeWebP } from '@jsquash/webp';

import { ImageOptimizerError } from './errors';
import type { ImageFormat } from './image-format';
import { isAnimatedPng } from './png';
import { isAnimatedWebP } from './webp';

export type DecodableImageFormat = Extract<
    ImageFormat,
    'jpeg' | 'png' | 'webp'
>;

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
    }
}