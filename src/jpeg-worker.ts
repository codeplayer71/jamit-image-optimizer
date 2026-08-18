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

self.onmessage = async (event: MessageEvent<ProcessImageMessage>) => {
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

    const resizeStartedAt = performance.now();

    const outputImageData = shouldResize
        ? await resize(originalImageData, outputDimensions)
        : originalImageData;

    const resizeMs = performance.now() - resizeStartedAt;

    const encodeStartedAt = performance.now();
    const outputBuffer = await encode(outputImageData, {
        quality: event.data.quality,
    });
    const encodeMs = performance.now() - encodeStartedAt;

    self.postMessage(
        {
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