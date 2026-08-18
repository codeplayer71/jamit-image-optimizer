import { ImageOptimizerError } from './errors';
import type {
    ImageOptimizationOptions,
    ImageOptimizationResult,
    ImageProcessingStatus,
    ImageResizeOptions,
} from './types';

type WorkerResult = {
    type: 'result';
    buffer: ArrayBuffer;
    originalWidth: number;
    originalHeight: number;
    outputWidth: number;
    outputHeight: number;
    decodeMs: number;
    resizeMs: number;
    encodeMs: number;
    finalQuality: number;
    encodeAttempts: number;
    targetReached?: boolean;
};

type WorkerStatus = {
    type: 'status';
    stage: 'decoding' | 'resizing' | 'encoding';
    progress: null;
};

type WorkerMessage = WorkerResult | WorkerStatus;

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

    const targetSize = options.targetSize;

    if (
        targetSize !== undefined &&
        (!Number.isSafeInteger(targetSize) || targetSize <= 0)
    ) {
        throw new ImageOptimizerError(
            'invalid-options',
            'targetSize must be a positive integer number of bytes.',
        );
    }

    const minQuality = options.minQuality;

    if (
        minQuality !== undefined &&
        (!Number.isFinite(minQuality) || minQuality <= 0 || minQuality > 1)
    ) {
        throw new ImageOptimizerError(
            'invalid-options',
            'minQuality must be greater than 0 and less than or equal to 1.',
        );
    }

    if (minQuality !== undefined && minQuality > quality) {
        throw new ImageOptimizerError(
            'invalid-options',
            'minQuality must be less than or equal to quality.',
        );
    }

    const { maxWidth, maxHeight } = options.resize ?? {};

    if (
        (maxWidth !== undefined && (!Number.isFinite(maxWidth) || maxWidth <= 0)) ||
        (maxHeight !== undefined && (!Number.isFinite(maxHeight) || maxHeight <= 0))
    ) {
        throw new ImageOptimizerError(
            'invalid-options',
            'resize dimensions must be greater than 0.',
        );
    }

    if (options.signal?.aborted) {
        throw new ImageOptimizerError(
            'aborted',
            'Image optimization was aborted.',
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

    emitStatus(options.onStatus, {
        stage: 'queued',
        progress: null,
    });

    const startedAt = performance.now();
    const inputBuffer = await file.arrayBuffer();

    const workerResult = await processImage(
        inputBuffer,
        quality,
        options.resize,
        options.targetSize,
        options.minQuality,
        options.signal,
        options.onStatus,
    );

    emitStatus(options.onStatus, {
        stage: 'finalizing',
        progress: null,
    });

    const outputFile = new File([workerResult.buffer], file.name, {
        type: 'image/jpeg',
        lastModified: file.lastModified,
    });

    const outputIsLarger = outputFile.size >= file.size;

    if (outputIsLarger) {
        const result: ImageOptimizationResult = {
            file,
            optimized: false,
            reason: 'output-larger-than-input',
            original: {
                name: file.name,
                type: file.type,
                size: file.size,
                width: workerResult.originalWidth,
                height: workerResult.originalHeight,
            },
            output: {
                name: file.name,
                type: file.type,
                size: file.size,
                width: workerResult.originalWidth,
                height: workerResult.originalHeight,
            },
            compression: {
                quality: workerResult.finalQuality / 100,
                encodeAttempts: workerResult.encodeAttempts,
                ...(options.targetSize !== undefined && {
                    targetSize: options.targetSize,
                }),
                ...(workerResult.targetReached !== undefined && {
                    targetReached: workerResult.targetReached,
                }),
            },
            savings: {
                bytes: 0,
                ratio: 1,
                percent: 0,
            },
            timing: {
                totalMs: performance.now() - startedAt,
                decodeMs: workerResult.decodeMs,
                resizeMs: workerResult.resizeMs,
                encodeMs: workerResult.encodeMs,
            },
        };

        emitStatus(options.onStatus, {
            stage: 'completed',
            progress: null,
        });

        return result;
    }

    const savedBytes = file.size - outputFile.size;
    const ratio = outputFile.size / file.size;

    const result: ImageOptimizationResult = {
        file: outputFile,
        optimized: true,
        original: {
            name: file.name,
            type: file.type,
            size: file.size,
            width: workerResult.originalWidth,
            height: workerResult.originalHeight,
        },
        output: {
            name: outputFile.name,
            type: outputFile.type,
            size: outputFile.size,
            width: workerResult.outputWidth,
            height: workerResult.outputHeight,
        },
        compression: {
            quality: workerResult.finalQuality / 100,
            encodeAttempts: workerResult.encodeAttempts,
            ...(options.targetSize !== undefined && {
                targetSize: options.targetSize,
            }),
            ...(workerResult.targetReached !== undefined && {
                targetReached: workerResult.targetReached,
            }),
        },
        savings: {
            bytes: savedBytes,
            ratio,
            percent: (1 - ratio) * 100,
        },
        timing: {
            totalMs: performance.now() - startedAt,
            decodeMs: workerResult.decodeMs,
            resizeMs: workerResult.resizeMs,
            encodeMs: workerResult.encodeMs,
        },
    };

    emitStatus(options.onStatus, {
        stage: 'completed',
        progress: null,
    });

    return result;
}

function processImage(
    buffer: ArrayBuffer,
    quality: number,
    resize?: ImageResizeOptions,
    targetSize?: number,
    minQuality?: number,
    signal?: AbortSignal,
    onStatus?: (status: ImageProcessingStatus) => void,
): Promise<WorkerResult> {
    return new Promise((resolve, reject) => {
        const worker = new Worker(
            new URL('./jpeg-worker.ts', import.meta.url),
            {
                type: 'module',
            },
        );

        const handleAbort = () => {
            worker.terminate();
            signal?.removeEventListener('abort', handleAbort);

            reject(
                new ImageOptimizerError(
                    'aborted',
                    'Image optimization was aborted.',
                ),
            );
        };

        if (signal?.aborted) {
            handleAbort();
            return;
        }

        signal?.addEventListener('abort', handleAbort, {
            once: true,
        });

        worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
            if (event.data.type === 'status') {
                emitStatus(onStatus, {
                    stage: event.data.stage,
                    progress: event.data.progress,
                });

                return;
            }

            signal?.removeEventListener('abort', handleAbort);
            worker.terminate();
            resolve(event.data);
        };

        worker.onerror = (event) => {
            signal?.removeEventListener('abort', handleAbort);
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
                ...(targetSize !== undefined && {
                    targetSize,
                }),
                ...(minQuality !== undefined && {
                    minQuality: minQuality * 100,
                }),
                ...(resize?.maxWidth !== undefined && {
                    maxWidth: resize.maxWidth,
                }),
                ...(resize?.maxHeight !== undefined && {
                    maxHeight: resize.maxHeight,
                }),
            },
            [buffer],
        );
    });
}

function emitStatus(
    onStatus: ((status: ImageProcessingStatus) => void) | undefined,
    status: ImageProcessingStatus,
): void {
    onStatus?.(status);
}