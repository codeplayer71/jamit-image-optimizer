import { mapWithConcurrency } from './concurrency';
import {
    ImageOptimizerError,
    isImageOptimizerError,
} from './errors';
import { classifyFile } from './file-classification';
import { optimizeImage } from './optimize-image';
import { calculateSizeMetrics } from './size-metrics';
import type {
    FileProcessingBatchResult,
    FileProcessingItemResult,
    ProcessFilesOptions,
} from './types';

type ImageJob = {
    index: number;
    file: File;
};

export async function processFiles(
    files: readonly File[] | FileList,
    options: ProcessFilesOptions = {},
): Promise<FileProcessingBatchResult> {
    const inputFiles = Array.from(files);
    const errorMode = options.errorMode ?? 'passthrough';
    const concurrency = options.concurrency ?? 1;

    if (
        !Number.isSafeInteger(concurrency) ||
        concurrency <= 0
    ) {
        throw new ImageOptimizerError(
            'invalid-options',
            'concurrency must be a positive integer.',
        );
    }

    const items = new Array<FileProcessingItemResult | undefined>(
        inputFiles.length,
    );

    const imageJobs: ImageJob[] = [];

    for (const [index, file] of inputFiles.entries()) {
        const classification = classifyFile(file);

        if (classification === 'passthrough') {
            items[index] = {
                index,
                originalFile: file,
                file,
                kind: 'passthrough',
                outcome: 'unchanged',
                reason: 'non-image',
            };

            continue;
        }

        if (classification === 'unsupported-image') {
            items[index] = {
                index,
                originalFile: file,
                file,
                kind: 'image',
                outcome: 'unchanged',
                reason: 'unsupported-image-format',
            };

            continue;
        }

        imageJobs.push({
            index,
            file,
        });
    }

    const processedImages = await mapWithConcurrency(
        imageJobs,
        concurrency,
        async ({ index, file }): Promise<FileProcessingItemResult> => {
            try {
                const optimization = await optimizeImage(file, options);

                return {
                    index,
                    originalFile: file,
                    file: optimization.file,
                    kind: 'image',
                    outcome: optimization.optimized
                        ? 'optimized'
                        : optimization.changed
                            ? 'changed'
                            : 'unchanged',
                    ...(optimization.reason !== undefined && {
                        reason: optimization.reason,
                    }),
                    optimization,
                } satisfies FileProcessingItemResult;
            } catch (error) {
                if (
                    errorMode === 'throw' ||
                    !isImageOptimizerError(error) ||
                    error.code === 'aborted'
                ) {
                    throw error;
                }

                if (error.code === 'unsupported-format') {
                    return {
                        index,
                        originalFile: file,
                        file,
                        kind: 'image',
                        outcome: 'unchanged',
                        reason: 'unsupported-image-format',
                    };
                }

                if (error.code === 'codec-not-supported') {
                    return {
                        index,
                        originalFile: file,
                        file,
                        kind: 'image',
                        outcome: 'unchanged',
                        reason: 'codec-not-supported',
                    };
                }

                if (error.code === 'transparency-not-supported') {
                    return {
                        index,
                        originalFile: file,
                        file,
                        kind: 'image',
                        outcome: 'unchanged',
                        reason: 'transparency-not-supported',
                    };
                }

                if (error.code === 'resource-limit-exceeded') {
                    return {
                        index,
                        originalFile: file,
                        file,
                        kind: 'image',
                        outcome: 'unchanged',
                        reason: 'resource-limit-exceeded',
                    };
                }

                return {
                    index,
                    originalFile: file,
                    file,
                    kind: 'image',
                    outcome: 'failed-passthrough',
                    reason: 'optimization-failed',
                    error,
                } satisfies FileProcessingItemResult;
            }
        },
    );

    for (const item of processedImages) {
        items[item.index] = item;
    }

    const completeItems = items.map((item, index) => {
        if (!item) {
            throw new Error(
                `Missing processing result for file at index ${index}.`,
            );
        }

        return item;
    });

    const resultFiles = completeItems.map((item) => item.file);

    const originalBytes = inputFiles.reduce(
        (total, file) => total + file.size,
        0,
    );

    const outputBytes = resultFiles.reduce(
        (total, file) => total + file.size,
        0,
    );

    const sizeMetrics = calculateSizeMetrics(
        originalBytes,
        outputBytes,
    );

    return {
        files: resultFiles,
        items: completeItems,
        summary: {
            totalFiles: inputFiles.length,
            imageFiles: completeItems.filter(
                (item) => item.kind === 'image',
            ).length,
            optimizedFiles: completeItems.filter(
                (item) => item.outcome === 'optimized',
            ).length,
            changedFiles: completeItems.filter(
                (item) => item.outcome === 'changed',
            ).length,
            unchangedFiles: completeItems.filter(
                (item) => item.outcome === 'unchanged',
            ).length,
            failedOptimizations: completeItems.filter(
                (item) => item.outcome === 'failed-passthrough',
            ).length,
            originalBytes,
            outputBytes,
            savings: sizeMetrics.savings,
            sizeChange: sizeMetrics.sizeChange,
        },
    };
}