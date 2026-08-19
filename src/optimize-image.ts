import { ImageOptimizerError } from './errors';
import { detectImageFormat } from './image-detection';
import {
    getImageFormat,
    type ImageFormat,
} from './image-format';
import {
    exceedsInputByteLimit,
    resolveImageProcessingLimits,
} from './image-limits';
import {
    getOutputFileName,
    getOutputMimeType,
} from './output-file';
import { resolveOutputFormat } from './output-format';
import { calculateSizeMetrics } from './size-metrics';
import type {
    ImageOptimizationOptions,
    ImageOptimizationResult,
    ImageOutputFormat,
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
    finalQuality?: number;
    encodeAttempts: number;
    targetReached?: boolean;
};

type WorkerStatus = {
    type: 'status';
    stage: 'decoding' | 'resizing' | 'encoding';
    progress: null;
};

type WorkerError = {
    type: 'error';
    code:
        | 'unsupported-format'
        | 'codec-not-supported'
        | 'transparency-not-supported'
        | 'resource-limit-exceeded'
        | 'worker-failed';
    message: string;
};

type WorkerMessage =
    | WorkerResult
    | WorkerStatus
    | WorkerError;

const DEFAULT_QUALITY = 0.8;

export async function optimizeImage(
    file: File,
    options: ImageOptimizationOptions = {},
): Promise<ImageOptimizationResult> {
    const quality = options.quality ?? DEFAULT_QUALITY;

    if (
        !Number.isFinite(quality) ||
        quality <= 0 ||
        quality > 1
    ) {
        throw new ImageOptimizerError(
            'invalid-options',
            'quality must be greater than 0 and less than or equal to 1.',
        );
    }

    const targetSize = options.targetSize;

    if (
        targetSize !== undefined &&
        (
            !Number.isSafeInteger(targetSize) ||
            targetSize <= 0
        )
    ) {
        throw new ImageOptimizerError(
            'invalid-options',
            'targetSize must be a positive integer number of bytes.',
        );
    }

    const minQuality = options.minQuality;

    if (
        minQuality !== undefined &&
        (
            !Number.isFinite(minQuality) ||
            minQuality <= 0 ||
            minQuality > 1
        )
    ) {
        throw new ImageOptimizerError(
            'invalid-options',
            'minQuality must be greater than 0 and less than or equal to 1.',
        );
    }

    if (
        minQuality !== undefined &&
        targetSize === undefined
    ) {
        throw new ImageOptimizerError(
            'invalid-options',
            'minQuality can only be used together with targetSize.',
        );
    }

    if (
        minQuality !== undefined &&
        minQuality > quality
    ) {
        throw new ImageOptimizerError(
            'invalid-options',
            'minQuality must be less than or equal to quality.',
        );
    }

    const mode = options.mode ?? 'original';

    if (
        mode !== 'original' &&
        mode !== 'format' &&
        mode !== 'auto'
    ) {
        throw new ImageOptimizerError(
            'invalid-options',
            'mode must be either "original", "format", or "auto".',
        );
    }

    if (
        options.format !== undefined &&
        options.format !== 'jpeg' &&
        options.format !== 'png' &&
        options.format !== 'webp'
    ) {
        throw new ImageOptimizerError(
            'invalid-options',
            'format must be either "jpeg", "png", or "webp".',
        );
    }

    if (
        mode === 'format' &&
        options.format === undefined
    ) {
        throw new ImageOptimizerError(
            'invalid-options',
            'format is required when mode is "format".',
        );
    }

    if (
        mode !== 'format' &&
        options.format !== undefined
    ) {
        throw new ImageOptimizerError(
            'invalid-options',
            'format can only be used when mode is "format".',
        );
    }

    const {
        maxWidth,
        maxHeight,
    } = options.resize ?? {};

    if (
        (
            maxWidth !== undefined &&
            (
                !Number.isSafeInteger(maxWidth) ||
                maxWidth <= 0
            )
        ) ||
        (
            maxHeight !== undefined &&
            (
                !Number.isSafeInteger(maxHeight) ||
                maxHeight <= 0
            )
        )
    ) {
        throw new ImageOptimizerError(
            'invalid-options',
            'resize dimensions must be positive integers.',
        );
    }

    let limits;

    try {
        limits = resolveImageProcessingLimits(
            options.limits,
        );
    } catch (error) {
        throw new ImageOptimizerError(
            'invalid-options',
            error instanceof Error
                ? error.message
                : 'Invalid image processing limits.',
        );
    }

    if (
        exceedsInputByteLimit(
            file.size,
            limits,
        )
    ) {
        throw new ImageOptimizerError(
            'resource-limit-exceeded',
            `Input file size of ${file.size} bytes exceeds the configured limit of ${limits.maxInputBytes} bytes.`,
        );
    }

    if (options.signal?.aborted) {
        throw new ImageOptimizerError(
            'aborted',
            'Image optimization was aborted.',
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

    const declaredInputFormat =
        getImageFormat(file);

    const inputFormat = detectImageFormat(
        file,
        inputBuffer,
    );

    if (!inputFormat) {
        throw new ImageOptimizerError(
            'unsupported-format',
            `Unsupported or unrecognized image format: ${file.type || 'unknown'}.`,
        );
    }

    const outputFormat = resolveOutputFormat(
        inputFormat,
        options,
    );

    if (!outputFormat) {
        throw new ImageOptimizerError(
            'output-format-not-supported',
            `The original format "${inputFormat}" cannot be encoded.`,
        );
    }

    const workerResult = await processImage(
        inputFormat,
        outputFormat,
        inputBuffer,
        quality,
        options.resize,
        options.targetSize,
        options.minQuality,
        limits.maxPixels,
        limits.maxDimension,
        options.signal,
        options.onStatus,
    );

    emitStatus(options.onStatus, {
        stage: 'finalizing',
        progress: null,
    });

    const shouldNormalizeOutputMetadata =
        outputFormat !== inputFormat ||
        declaredInputFormat !== inputFormat;

    const outputFileName =
        shouldNormalizeOutputMetadata
            ? getOutputFileName(
                file.name,
                outputFormat,
            )
            : file.name;

    const outputMimeType =
        shouldNormalizeOutputMetadata
            ? getOutputMimeType(outputFormat)
            : file.type;

    const outputFile = new File(
        [workerResult.buffer],
        outputFileName,
        {
            type: outputMimeType,
            lastModified: file.lastModified,
        },
    );

    const shouldKeepOriginal =
        mode !== 'format' &&
        outputFile.size >= file.size;

    if (shouldKeepOriginal) {
        const sizeMetrics = calculateSizeMetrics(
            file.size,
            file.size,
        );

        const result: ImageOptimizationResult = {
            file,
            optimized: false,
            converted: false,
            changed: false,
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
            compression: createCompressionResult(
                workerResult,
                options,
            ),
            savings: sizeMetrics.savings,
            sizeChange: sizeMetrics.sizeChange,
            timing: {
                totalMs:
                    performance.now() -
                    startedAt,
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

    const sizeMetrics = calculateSizeMetrics(
        file.size,
        outputFile.size,
    );

    const optimized =
        outputFile.size < file.size;

    const converted =
        outputFormat !== inputFormat;

    const result: ImageOptimizationResult = {
        file: outputFile,
        optimized,
        converted,
        changed: true,
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
        compression: createCompressionResult(
            workerResult,
            options,
        ),
        savings: sizeMetrics.savings,
        sizeChange: sizeMetrics.sizeChange,
        timing: {
            totalMs:
                performance.now() -
                startedAt,
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
    inputFormat: ImageFormat,
    outputFormat: ImageOutputFormat,
    buffer: ArrayBuffer,
    quality: number,
    resize?: ImageResizeOptions,
    targetSize?: number,
    minQuality?: number,
    maxPixels?: number,
    maxDimension?: number,
    signal?: AbortSignal,
    onStatus?: (
        status: ImageProcessingStatus,
    ) => void,
): Promise<WorkerResult> {
    return new Promise((resolve, reject) => {
        const worker = createWorker();

        const handleAbort = () => {
            worker.terminate();

            signal?.removeEventListener(
                'abort',
                handleAbort,
            );

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

        signal?.addEventListener(
            'abort',
            handleAbort,
            {
                once: true,
            },
        );

        worker.onmessage = (
            event: MessageEvent<WorkerMessage>,
        ) => {
            if (event.data.type === 'status') {
                emitStatus(onStatus, {
                    stage: event.data.stage,
                    progress:
                    event.data.progress,
                });

                return;
            }

            if (event.data.type === 'error') {
                signal?.removeEventListener(
                    'abort',
                    handleAbort,
                );

                worker.terminate();

                reject(
                    new ImageOptimizerError(
                        event.data.code,
                        event.data.message,
                    ),
                );

                return;
            }

            signal?.removeEventListener(
                'abort',
                handleAbort,
            );

            worker.terminate();
            resolve(event.data);
        };

        worker.onerror = (event) => {
            signal?.removeEventListener(
                'abort',
                handleAbort,
            );

            worker.terminate();

            reject(
                new ImageOptimizerError(
                    'worker-failed',
                    event.message ||
                    'Image worker failed.',
                ),
            );
        };

        worker.postMessage(
            {
                buffer,
                inputFormat,
                outputFormat,
                quality: quality * 100,
                ...(targetSize !== undefined && {
                    targetSize,
                }),
                ...(minQuality !== undefined && {
                    minQuality:
                        minQuality * 100,
                }),
                ...(maxPixels !== undefined && {
                    maxPixels,
                }),
                ...(maxDimension !== undefined && {
                    maxDimension,
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

function createWorker(): Worker {
    return new Worker(
        new URL(
            './image-worker.ts',
            import.meta.url,
        ),
        {
            type: 'module',
        },
    );
}

function createCompressionResult(
    workerResult: WorkerResult,
    options: ImageOptimizationOptions,
): ImageOptimizationResult['compression'] {
    return {
        ...(workerResult.finalQuality !== undefined && {
            quality:
                workerResult.finalQuality / 100,
        }),
        encodeAttempts:
        workerResult.encodeAttempts,
        ...(
            options.targetSize !== undefined &&
            workerResult.targetReached !== undefined && {
                targetSize: options.targetSize,
                targetReached:
                workerResult.targetReached,
            }
        ),
    };
}

function emitStatus(
    onStatus:
        | ((
        status: ImageProcessingStatus,
    ) => void)
        | undefined,
    status: ImageProcessingStatus,
): void {
    onStatus?.(status);
}