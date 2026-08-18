/// <reference lib="webworker" />

import { decode, encode } from '@jsquash/jpeg';
import resize from '@jsquash/resize';

import { calculateResizeDimensions } from './resize';
import { searchTargetSize } from './target-size';

type ProcessImageMessage = {
    buffer: ArrayBuffer;
    quality: number;
    targetSize?: number;
    minQuality?: number;
    maxWidth?: number;
    maxHeight?: number;
};

const DEFAULT_MIN_QUALITY = 50;
const MAX_ENCODE_ATTEMPTS = 6;

function postStatus(
    stage: 'decoding' | 'resizing' | 'encoding',
): void {
    self.postMessage({
        type: 'status',
        stage,
        progress: null,
    });
}

self.onmessage = async (event: MessageEvent<ProcessImageMessage>) => {
    postStatus('decoding');

    const decodeStartedAt = performance.now();
    const originalImageData = await decode(event.data.buffer);
    const decodeMs = performance.now() - decodeStartedAt;

    const outputDimensions = calculateResizeDimensions(
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
        outputDimensions.width !== originalImageData.width ||
        outputDimensions.height !== originalImageData.height;

    let outputImageData = originalImageData;
    let resizeMs = 0;

    if (shouldResize) {
        postStatus('resizing');

        const resizeStartedAt = performance.now();

        outputImageData = await resize(
            originalImageData,
            outputDimensions,
        );

        resizeMs = performance.now() - resizeStartedAt;
    }

    postStatus('encoding');

    const encodeStartedAt = performance.now();

    let outputBuffer: ArrayBuffer;
    let finalQuality = event.data.quality;
    let encodeAttempts = 1;
    let targetReached: boolean | undefined;

    if (event.data.targetSize !== undefined) {
        const searchResult = await searchTargetSize({
            targetSize: event.data.targetSize,
            initialQuality: event.data.quality,
            minQuality: event.data.minQuality ?? DEFAULT_MIN_QUALITY,
            maxAttempts: MAX_ENCODE_ATTEMPTS,
            encode: async (quality) => {
                const buffer = await encode(outputImageData, {
                    quality,
                });

                return {
                    value: buffer,
                    size: buffer.byteLength,
                };
            },
        });

        outputBuffer = searchResult.value;
        finalQuality = searchResult.quality;
        encodeAttempts = searchResult.attempts;
        targetReached = searchResult.targetReached;
    } else {
        outputBuffer = await encode(outputImageData, {
            quality: event.data.quality,
        });
    }

    const encodeMs = performance.now() - encodeStartedAt;

    self.postMessage(
        {
            type: 'result',
            buffer: outputBuffer,
            originalWidth: originalImageData.width,
            originalHeight: originalImageData.height,
            outputWidth: outputImageData.width,
            outputHeight: outputImageData.height,
            decodeMs,
            resizeMs,
            encodeMs,
            finalQuality,
            encodeAttempts,
            ...(targetReached !== undefined && {
                targetReached,
            }),
        },
        {
            transfer: [outputBuffer],
        },
    );
};