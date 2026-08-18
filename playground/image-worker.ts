/// <reference lib="webworker" />

import { decode, encode } from '@jsquash/jpeg';

type ProcessImageMessage = {
    buffer: ArrayBuffer;
};

self.onmessage = async (event: MessageEvent<ProcessImageMessage>) => {
    const decodeStartedAt = performance.now();
    const imageData = await decode(event.data.buffer);
    const decodeMs = performance.now() - decodeStartedAt;

    const encodeStartedAt = performance.now();
    const outputBuffer = await encode(imageData, {
        quality: 75,
    });
    const encodeMs = performance.now() - encodeStartedAt;

    self.postMessage(
        {
            buffer: outputBuffer,
            width: imageData.width,
            height: imageData.height,
            decodeMs,
            encodeMs,
        },
        {
            transfer: [outputBuffer],
        },
    );
};