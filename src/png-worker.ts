/// <reference lib="webworker" />

import { decode, encode } from '@jsquash/png';
import resize from '@jsquash/resize';

import { isAnimatedPng } from './png';
import { calculateResizeDimensions } from './resize';

type ProcessImageMessage = {
    buffer: ArrayBuffer;
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
    if (isAnimatedPng(event.data.buffer)) {
        self.postMessage({
            type: 'error',
            code: 'unsupported-format',
            message: 'Animated PNG images are not supported.',
        });

        return;
    }

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
    const outputBuffer = await encode(outputImageData);
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
            encodeAttempts: 1,
        },
        {
            transfer: [outputBuffer],
        },
    );
};