import {
    optimizeImage,
    processFiles,
} from '../src';

type BrowserOptimizationResult = {
    originalType: string;
    outputType: string;
    originalWidth: number;
    originalHeight: number;
    outputWidth: number;
    outputHeight: number;
    changed: boolean;
    converted: boolean;
};

type BrowserBatchResult = {
    names: string[];
    types: string[];
    outcomes: string[];
    totalFiles: number;
    imageFiles: number;
    unchangedFiles: number;
    failedOptimizations: number;
    processedImages: number;
};

type BrowserConcurrencyResult = {
    maxActiveWorkers: number;
    createdWorkers: number;
    processedImages: number;
};

type BrowserAbortResult = {
    code: string | null;
    createdWorkers: number;
    terminatedWorkers: number;
};

type BrowserSignatureResult = {
    names: string[];
    types: string[];
    outcomes: string[];
    imageFiles: number;
    failedOptimizations: number;
};

type BrowserResourceLimitResult = {
    dimensionErrorCode: string | null;
    pixelErrorCode: string | null;
};

type BrowserTargetSizeResult = {
    highQualitySize: number;
    lowQualitySize: number;
    outputSize: number;
    targetSize: number | null;
    targetReached: boolean | null;
    quality: number | null;
    encodeAttempts: number;
};

declare global {
    interface Window {
        runImageOptimizationTest:
            () => Promise<BrowserOptimizationResult>;

        runBatchOptimizationTest:
            () => Promise<BrowserBatchResult>;

        runConcurrencyTest:
            () => Promise<BrowserConcurrencyResult>;

        runAbortTest:
            () => Promise<BrowserAbortResult>;

        runSignatureDetectionTest:
            () => Promise<BrowserSignatureResult>;

        runResourceLimitTest:
            () => Promise<BrowserResourceLimitResult>;

        runTargetSizeTest:
            () => Promise<BrowserTargetSizeResult>;
    }
}

window.runImageOptimizationTest =
    async (): Promise<BrowserOptimizationResult> => {
        const file = await createImageFile(
            'browser-test.jpg',
            'image/jpeg',
            64,
            48,
        );

        const result = await optimizeImage(
            file,
            {
                mode: 'format',
                format: 'webp',
                quality: 0.8,
                resize: {
                    maxWidth: 32,
                    maxHeight: 32,
                },
            },
        );

        return {
            originalType:
            result.original.type,
            outputType:
            result.output.type,
            originalWidth:
            result.original.width,
            originalHeight:
            result.original.height,
            outputWidth:
            result.output.width,
            outputHeight:
            result.output.height,
            changed:
            result.changed,
            converted:
            result.converted,
        };
    };

window.runBatchOptimizationTest =
    async (): Promise<BrowserBatchResult> => {
        const jpeg = await createImageFile(
            'first.jpg',
            'image/jpeg',
            320,
            240,
        );

        const png = await createImageFile(
            'second.png',
            'image/png',
            320,
            240,
        );

        const text = new File(
            [
                'JamIT browser integration test',
            ],
            'notes.txt',
            {
                type: 'text/plain',
            },
        );

        const result = await processFiles(
            [
                jpeg,
                text,
                png,
            ],
            {
                mode: 'format',
                format: 'webp',
                quality: 0.8,
                concurrency: 2,
            },
        );

        return {
            names: result.files.map(
                (file) => file.name,
            ),
            types: result.files.map(
                (file) => file.type,
            ),
            outcomes: result.items.map(
                (item) => item.outcome,
            ),
            totalFiles:
            result.summary.totalFiles,
            imageFiles:
            result.summary.imageFiles,
            unchangedFiles:
            result.summary.unchangedFiles,
            failedOptimizations:
            result.summary.failedOptimizations,
            processedImages:
                result.summary.optimizedFiles +
                result.summary.changedFiles,
        };
    };

window.runConcurrencyTest =
    async (): Promise<BrowserConcurrencyResult> => {
        const NativeWorker = window.Worker;

        let activeWorkers = 0;
        let maxActiveWorkers = 0;
        let createdWorkers = 0;

        const TrackingWorker = new Proxy(
            NativeWorker,
            {
                construct(
                    Target,
                    args,
                ) {
                    const worker = Reflect.construct(
                        Target,
                        args,
                        Target,
                    ) as Worker;

                    createdWorkers += 1;
                    activeWorkers += 1;

                    maxActiveWorkers = Math.max(
                        maxActiveWorkers,
                        activeWorkers,
                    );

                    let completed = false;

                    const markCompleted = () => {
                        if (completed) {
                            return;
                        }

                        completed = true;
                        activeWorkers -= 1;
                    };

                    worker.addEventListener(
                        'message',
                        (event) => {
                            const data =
                                event.data as {
                                    type?: string;
                                };

                            if (
                                data.type ===
                                'result' ||
                                data.type ===
                                'error'
                            ) {
                                markCompleted();
                            }
                        },
                    );

                    worker.addEventListener(
                        'error',
                        markCompleted,
                    );

                    return worker;
                },
            },
        );

        window.Worker =
            TrackingWorker as typeof Worker;

        try {
            const files =
                await Promise.all([
                    createImageFile(
                        'first.jpg',
                        'image/jpeg',
                        640,
                        480,
                    ),
                    createImageFile(
                        'second.jpg',
                        'image/jpeg',
                        640,
                        480,
                    ),
                    createImageFile(
                        'third.jpg',
                        'image/jpeg',
                        640,
                        480,
                    ),
                ]);

            const result =
                await processFiles(
                    files,
                    {
                        mode: 'format',
                        format: 'webp',
                        quality: 0.8,
                        concurrency: 2,
                    },
                );

            return {
                maxActiveWorkers,
                createdWorkers,
                processedImages:
                    result.summary
                        .optimizedFiles +
                    result.summary
                        .changedFiles,
            };
        } finally {
            window.Worker = NativeWorker;
        }
    };

window.runAbortTest =
    async (): Promise<BrowserAbortResult> => {
        const NativeWorker = window.Worker;

        let createdWorkers = 0;
        let terminatedWorkers = 0;

        let resolveWorkerCreated!: () => void;

        const workerCreated =
            new Promise<void>((resolve) => {
                resolveWorkerCreated = resolve;
            });

        const TrackingWorker = new Proxy(
            NativeWorker,
            {
                construct(
                    Target,
                    args,
                ) {
                    const worker = Reflect.construct(
                        Target,
                        args,
                        Target,
                    ) as Worker;

                    createdWorkers += 1;

                    const nativeTerminate =
                        worker.terminate.bind(
                            worker,
                        );

                    worker.terminate = () => {
                        terminatedWorkers += 1;
                        nativeTerminate();
                    };

                    resolveWorkerCreated();

                    return worker;
                },
            },
        );

        window.Worker =
            TrackingWorker as typeof Worker;

        try {
            const file = await createImageFile(
                'abort-test.jpg',
                'image/jpeg',
                2_400,
                1_800,
            );

            const controller =
                new AbortController();

            const promise = optimizeImage(
                file,
                {
                    mode: 'format',
                    format: 'webp',
                    quality: 0.8,
                    resize: {
                        maxWidth: 1_920,
                        maxHeight: 1_920,
                    },
                    signal:
                    controller.signal,
                },
            );

            await workerCreated;

            controller.abort();

            try {
                await promise;

                return {
                    code: null,
                    createdWorkers,
                    terminatedWorkers,
                };
            } catch (error) {
                const code =
                    typeof error === 'object' &&
                    error !== null &&
                    'code' in error &&
                    typeof error.code ===
                    'string'
                        ? error.code
                        : null;

                return {
                    code,
                    createdWorkers,
                    terminatedWorkers,
                };
            }
        } finally {
            window.Worker = NativeWorker;
        }
    };

window.runSignatureDetectionTest =
    async (): Promise<BrowserSignatureResult> => {
        const firstSource =
            await createImageFile(
                'source.jpg',
                'image/jpeg',
                320,
                240,
            );

        const secondSource =
            await createImageFile(
                'source.jpg',
                'image/jpeg',
                320,
                240,
            );

        const emptyMimeFile = new File(
            [
                await firstSource.arrayBuffer(),
            ],
            'empty-mime.bin',
            {
                type: '',
            },
        );

        const incorrectMimeFile = new File(
            [
                await secondSource.arrayBuffer(),
            ],
            'incorrect-mime.bin',
            {
                type:
                    'application/octet-stream',
            },
        );

        const result = await processFiles(
            [
                emptyMimeFile,
                incorrectMimeFile,
            ],
            {
                mode: 'format',
                format: 'webp',
                quality: 0.8,
                concurrency: 2,
            },
        );

        return {
            names: result.files.map(
                (file) => file.name,
            ),
            types: result.files.map(
                (file) => file.type,
            ),
            outcomes: result.items.map(
                (item) => item.outcome,
            ),
            imageFiles:
            result.summary.imageFiles,
            failedOptimizations:
            result.summary
                .failedOptimizations,
        };
    };

window.runResourceLimitTest =
    async (): Promise<BrowserResourceLimitResult> => {
        const file = await createImageFile(
            'resource-limit.jpg',
            'image/jpeg',
            200,
            100,
        );

        const dimensionErrorCode =
            await getOptimizationErrorCode(
                file,
                {
                    maxDimension: 150,
                },
            );

        const pixelErrorCode =
            await getOptimizationErrorCode(
                file,
                {
                    maxPixels: 10_000,
                },
            );

        return {
            dimensionErrorCode,
            pixelErrorCode,
        };
    };

window.runTargetSizeTest =
    async (): Promise<BrowserTargetSizeResult> => {
        const file =
            await createDetailedImageFile(
                'target-size.png',
                640,
                480,
            );

        const highQualityResult =
            await optimizeImage(
                file,
                {
                    mode: 'format',
                    format: 'webp',
                    quality: 0.9,
                },
            );

        const lowQualityResult =
            await optimizeImage(
                file,
                {
                    mode: 'format',
                    format: 'webp',
                    quality: 0.2,
                },
            );

        const highQualitySize =
            highQualityResult.output.size;

        const lowQualitySize =
            lowQualityResult.output.size;

        const targetSize = Math.floor(
            lowQualitySize +
            (
                highQualitySize -
                lowQualitySize
            ) /
            2,
        );

        const result = await optimizeImage(
            file,
            {
                mode: 'format',
                format: 'webp',
                quality: 0.9,
                targetSize,
                minQuality: 0.2,
            },
        );

        return {
            highQualitySize,
            lowQualitySize,
            outputSize:
            result.output.size,
            targetSize:
                result.compression
                    .targetSize ??
                null,
            targetReached:
                result.compression
                    .targetReached ??
                null,
            quality:
                result.compression
                    .quality ??
                null,
            encodeAttempts:
            result.compression
                .encodeAttempts,
        };
    };

async function createImageFile(
    name: string,
    type: 'image/jpeg' | 'image/png',
    width: number,
    height: number,
): Promise<File> {
    const canvas =
        document.createElement('canvas');

    canvas.width = width;
    canvas.height = height;

    const context =
        canvas.getContext('2d');

    if (!context) {
        throw new Error(
            'Canvas 2D context is unavailable.',
        );
    }

    const gradient =
        context.createLinearGradient(
            0,
            0,
            width,
            height,
        );

    gradient.addColorStop(
        0,
        '#ff0000',
    );

    gradient.addColorStop(
        0.5,
        '#00ff00',
    );

    gradient.addColorStop(
        1,
        '#0000ff',
    );

    context.fillStyle = gradient;

    context.fillRect(
        0,
        0,
        width,
        height,
    );

    const blob =
        await new Promise<Blob>(
            (resolve, reject) => {
                canvas.toBlob(
                    (result) => {
                        if (!result) {
                            reject(
                                new Error(
                                    `Failed to create ${type} test image.`,
                                ),
                            );

                            return;
                        }

                        resolve(result);
                    },
                    type,
                    0.95,
                );
            },
        );

    return new File(
        [blob],
        name,
        {
            type,
        },
    );
}

async function getOptimizationErrorCode(
    file: File,
    limits: {
        maxDimension?: number;
        maxPixels?: number;
    },
): Promise<string | null> {
    try {
        await optimizeImage(
            file,
            {
                mode: 'format',
                format: 'webp',
                limits,
            },
        );

        return null;
    } catch (error) {
        if (
            typeof error === 'object' &&
            error !== null &&
            'code' in error &&
            typeof error.code === 'string'
        ) {
            return error.code;
        }

        return null;
    }
}

async function createDetailedImageFile(
    name: string,
    width: number,
    height: number,
): Promise<File> {
    const canvas =
        document.createElement('canvas');

    canvas.width = width;
    canvas.height = height;

    const context =
        canvas.getContext('2d');

    if (!context) {
        throw new Error(
            'Canvas 2D context is unavailable.',
        );
    }

    const imageData =
        context.createImageData(
            width,
            height,
        );

    let seed = 123_456_789;

    for (
        let index = 0;
        index < imageData.data.length;
        index += 4
    ) {
        seed =
            (
                seed * 1_664_525 +
                1_013_904_223
            ) >>> 0;

        imageData.data[index] =
            seed & 0xff;

        imageData.data[index + 1] =
            (seed >>> 8) & 0xff;

        imageData.data[index + 2] =
            (seed >>> 16) & 0xff;

        imageData.data[index + 3] =
            0xff;
    }

    context.putImageData(
        imageData,
        0,
        0,
    );

    const blob =
        await new Promise<Blob>(
            (resolve, reject) => {
                canvas.toBlob(
                    (result) => {
                        if (!result) {
                            reject(
                                new Error(
                                    'Failed to create target-size test image.',
                                ),
                            );

                            return;
                        }

                        resolve(result);
                    },
                    'image/png',
                );
            },
        );

    return new File(
        [blob],
        name,
        {
            type: 'image/png',
        },
    );
}