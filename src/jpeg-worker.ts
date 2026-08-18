/// <reference lib="webworker" />

import { decode, encode } from '@jsquash/jpeg';
import resize from '@jsquash/resize';

import { calculateResizeDimensions } from './resize';

type ProcessImageMessage = {
    buffer: ArrayBuffer;
    quality: number;
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

    const outputBuffer = await encode(outputImageData, {
        quality: event.data.quality,
    });

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
        },
        {
            transfer: [outputBuffer],
        },
    );
};