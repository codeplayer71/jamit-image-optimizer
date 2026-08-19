/// <reference lib="webworker" />

import resize from '@jsquash/resize';

import {
    decodeImage,
    type DecodableImageFormat,
} from './image-decoder';
import {
    encodeImage,
} from './image-encoder';
import {
    ImageOptimizerError,
    isImageOptimizerError,
} from './errors';
import { calculateResizeDimensions } from './resize';
import { hasTransparency } from './image-alpha';
import type { ImageOutputFormat } from './types';
type ProcessImageMessage = {
    buffer: ArrayBuffer;
    inputFormat: DecodableImageFormat;
    outputFormat: ImageOutputFormat;
    quality: number;
    targetSize?: number;
    minQuality?: number;
    maxWidth?: number;
    maxHeight?: number;
};

function postStatus(
    stage: 'decoding' | 'resizing' | 'encoding',
): void {
    self.postMessage({
        type: 'status',
        stage,
        progress: null,
    });
}

self.onmessage = async (
    event: MessageEvent<ProcessImageMessage>,
) => {
    try {
        postStatus('decoding');

        const decodeStartedAt = performance.now();

        const originalImageData = await decodeImage(
            event.data.buffer,
            event.data.inputFormat,
        );

        const decodeMs =
            performance.now() - decodeStartedAt;

        const outputDimensions =
            calculateResizeDimensions(
                {
                    width: originalImageData.width,
                    height: originalImageData.height,
                },
                {
                    ...(event.data.maxWidth !== undefined && {
                        maxWidth: event.data.maxWidth,
                    }),
                    ...(event.data.maxHeight !== undefined && {
                        maxHeight: event.data.maxHeight,
                    }),
                },
            );

        const shouldResize =
            outputDimensions.width !==
            originalImageData.width ||
            outputDimensions.height !==
            originalImageData.height;

        let outputImageData = originalImageData;
        let resizeMs = 0;

        if (shouldResize) {
            postStatus('resizing');

            const resizeStartedAt = performance.now();

            outputImageData = await resize(
                originalImageData,
                outputDimensions,
            );

            resizeMs =
                performance.now() - resizeStartedAt;
        }

        if (
            event.data.outputFormat === 'jpeg' &&
            hasTransparency(outputImageData)
        ) {
            throw new ImageOptimizerError(
                'transparency-not-supported',
                'JPEG output cannot preserve image transparency.',
            );
        }

        postStatus('encoding');

        const encodeStartedAt = performance.now();

        const encodeResult = await encodeImage({
            format: event.data.outputFormat,
            imageData: outputImageData,
            quality: event.data.quality,
            ...(event.data.targetSize !== undefined && {
                targetSize: event.data.targetSize,
            }),
            ...(event.data.minQuality !== undefined && {
                minQuality: event.data.minQuality,
            }),
        });

        const encodeMs =
            performance.now() - encodeStartedAt;

        self.postMessage(
            {
                type: 'result',
                buffer: encodeResult.buffer,
                originalWidth: originalImageData.width,
                originalHeight: originalImageData.height,
                outputWidth: outputImageData.width,
                outputHeight: outputImageData.height,
                decodeMs,
                resizeMs,
                encodeMs,
                ...(encodeResult.finalQuality !== undefined && {
                    finalQuality:
                    encodeResult.finalQuality,
                }),
                encodeAttempts:
                encodeResult.encodeAttempts,
                ...(encodeResult.targetReached !== undefined && {
                    targetReached:
                    encodeResult.targetReached,
                }),
            },
            {
                transfer: [encodeResult.buffer],
            },
        );
    } catch (error) {
        if (isImageOptimizerError(error)) {
            self.postMessage({
                type: 'error',
                code: error.code,
                message: error.message,
            });

            return;
        }

        self.postMessage({
            type: 'error',
            code: 'worker-failed',
            message:
                error instanceof Error
                    ? error.message
                    : 'Image worker failed.',
        });
    }
};