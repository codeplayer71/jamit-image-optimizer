import { ImageOptimizerError } from './errors';
import type {
    ImageOptimizationOptions,
    ImageOptimizationResult,
} from './types';

type WorkerResult = {
    buffer: ArrayBuffer;
    width: number;
    height: number;
    decodeMs: number;
    encodeMs: number;
};

const DEFAULT_QUALITY = 0.8;

export async function optimizeImage(
    file: File,
    options: ImageOptimizationOptions = {},
): Promise<ImageOptimizationResult> {
    const quality = options.quality ?? DEFAULT_QUALITY;

    if (!Number.isFinite(quality) || quality <= 0 || quality > 1) {
        throw new ImageOptimizerError(
            'invalid-options',
            'quality must be greater than 0 and less than or equal to 1.',
        );
    }

    if (file.type !== 'image/jpeg') {
        throw new ImageOptimizerError(
            'unsupported-format',
            `Unsupported image format: ${file.type || 'unknown'}.`,
        );
    }

    if (typeof Worker === 'undefined') {
        throw new ImageOptimizerError(
            'browser-not-supported',
            'Image optimization requires a browser environment.',
        );
    }

    const startedAt = performance.now();
    const inputBuffer = await file.arrayBuffer();

    const workerResult = await processImage(inputBuffer, quality);

    const outputFile = new File([workerResult.buffer], file.name, {
        type: 'image/jpeg',
        lastModified: file.lastModified,
    });

    const outputIsLarger = outputFile.size >= file.size;

    if (outputIsLarger) {
        return {
            file,
            optimized: false,
            reason: 'output-larger-than-input',
            original: {
                name: file.name,
                type: file.type,
                size: file.size,
                width: workerResult.width,
                height: workerResult.height,
            },
            output: {
                name: file.name,
                type: file.type,
                size: file.size,
                width: workerResult.width,
                height: workerResult.height,
            },
            savings: {
                bytes: 0,
                ratio: 1,
                percent: 0,
            },
            timing: {
                totalMs: performance.now() - startedAt,
                decodeMs: workerResult.decodeMs,
                encodeMs: workerResult.encodeMs,
            },
        };
    }

    const savedBytes = file.size - outputFile.size;
    const ratio = outputFile.size / file.size;

    return {
        file: outputFile,
        optimized: true,
        original: {
            name: file.name,
            type: file.type,
            size: file.size,
            width: workerResult.width,
            height: workerResult.height,
        },
        output: {
            name: outputFile.name,
            type: outputFile.type,
            size: outputFile.size,
            width: workerResult.width,
            height: workerResult.height,
        },
        savings: {
            bytes: savedBytes,
            ratio,
            percent: (1 - ratio) * 100,
        },
        timing: {
            totalMs: performance.now() - startedAt,
            decodeMs: workerResult.decodeMs,
            encodeMs: workerResult.encodeMs,
        },
    };
}

function processImage(
    buffer: ArrayBuffer,
    quality: number,
): Promise<WorkerResult> {
    return new Promise((resolve, reject) => {
        const worker = new Worker(
            new URL('./jpeg-worker.ts', import.meta.url),
            {
                type: 'module',
            },
        );

        worker.onmessage = (event: MessageEvent<WorkerResult>) => {
            worker.terminate();
            resolve(event.data);
        };

        worker.onerror = (event) => {
            worker.terminate();

            reject(
                new ImageOptimizerError(
                    'worker-failed',
                    event.message || 'Image worker failed.',
                ),
            );
        };

        worker.postMessage(
            {
                buffer,
                quality: quality * 100,
            },
            [buffer],
        );
    });
}