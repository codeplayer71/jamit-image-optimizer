export {
    ImageOptimizerError,
    isImageOptimizerError,
} from './errors';
export { optimizeImage } from './optimize-image';
export { processFiles } from './process-files';

export type { ImageOptimizerErrorCode } from './errors';

export type {
    FileProcessingBatchResult,
    FileProcessingBatchSummary,
    FileProcessingErrorMode,
    FileProcessingItemResult,
    FileProcessingKind,
    FileProcessingOutcome,
    ImageOptimizationOptions,
    ImageOptimizationResult,
    ImageOptimizationSkipReason,
    ImageProcessingStage,
    ImageProcessingStatus,
    ImageResizeOptions,
    ProcessFilesOptions,
} from './types';

