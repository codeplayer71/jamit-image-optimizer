export {
    ImageOptimizerError,
    isImageOptimizerError,
} from './errors';

export { optimizeImage } from './optimize-image';
export { processFiles } from './process-files';

export type {
    ImageOptimizerErrorCode,
} from './errors';

export type {
    ImageProcessingLimits,
} from './image-limits';

export type {
    SizeChange,
    SizeMetrics,
    SizeSavings,
} from './size-metrics';

export type {
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
    ImageOutputFormat,
    ImageOutputMode,
    ImageProcessingStage,
    ImageProcessingStatus,
    ImageResizeOptions,
    ProcessFilesOptions,
} from './types';