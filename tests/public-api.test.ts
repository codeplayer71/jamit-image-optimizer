import {
    ImageOptimizerError,
    isImageOptimizerError,
    optimizeImage,
    processFiles,
} from '../src';

import type {
    FileProcessingBatchResult,
    FileProcessingBatchSummary,
    FileProcessingClassificationReason,
    FileProcessingErrorMode,
    FileProcessingFailureReason,
    FileProcessingItemResult,
    FileProcessingKind,
    FileProcessingOutcome,
    FileProcessingReason,
    FileProcessingStatus,
    ImageCompressionResult,
    ImageFileMetadata,
    ImageOptimizationOptions,
    ImageOptimizationResult,
    ImageOptimizationSkipReason,
    ImageOptimizationTiming,
    ImageOptimizerErrorCode,
    ImageOutputFormat,
    ImageOutputMode,
    ImageProcessingLimits,
    ImageProcessingStage,
    ImageProcessingStatus,
    ImageResizeOptions,
    ProcessFilesOptions,
    SizeChange,
    SizeMetrics,
    SizeSavings,
} from '../src';

import {
    describe,
    expect,
    it,
} from 'vitest';

type PublicApiTypes = {
    imageOptimizerErrorCode: ImageOptimizerErrorCode;
    imageProcessingLimits: ImageProcessingLimits;

    sizeChange: SizeChange;
    sizeMetrics: SizeMetrics;
    sizeSavings: SizeSavings;

    imageResizeOptions: ImageResizeOptions;
    imageProcessingStage: ImageProcessingStage;
    imageProcessingStatus: ImageProcessingStatus;
    imageOutputFormat: ImageOutputFormat;
    imageOutputMode: ImageOutputMode;
    imageOptimizationOptions: ImageOptimizationOptions;
    imageOptimizationSkipReason: ImageOptimizationSkipReason;
    imageFileMetadata: ImageFileMetadata;
    imageCompressionResult: ImageCompressionResult;
    imageOptimizationTiming: ImageOptimizationTiming;
    imageOptimizationResult: ImageOptimizationResult;

    fileProcessingClassificationReason:
        FileProcessingClassificationReason;
    fileProcessingFailureReason:
        FileProcessingFailureReason;
    fileProcessingReason: FileProcessingReason;
    fileProcessingOutcome: FileProcessingOutcome;
    fileProcessingKind: FileProcessingKind;
    fileProcessingStatus: FileProcessingStatus;
    fileProcessingItemResult: FileProcessingItemResult;
    fileProcessingBatchSummary: FileProcessingBatchSummary;
    fileProcessingBatchResult: FileProcessingBatchResult;
    fileProcessingErrorMode: FileProcessingErrorMode;
    processFilesOptions: ProcessFilesOptions;
};

const publicApiTypes:
    PublicApiTypes | null = null;

describe('public API', () => {
    it('exports the public runtime API', () => {
        expect(
            typeof optimizeImage,
        ).toBe('function');

        expect(
            typeof processFiles,
        ).toBe('function');

        expect(
            typeof ImageOptimizerError,
        ).toBe('function');

        expect(
            typeof isImageOptimizerError,
        ).toBe('function');
    });

    it('keeps all public type exports importable from the package entry point', () => {
        expect(publicApiTypes).toBeNull();
    });
});