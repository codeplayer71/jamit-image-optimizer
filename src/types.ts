import type {
    ImageOptimizerError,
    ImageOptimizerErrorCode,
} from './errors';
import type {
    SizeChange,
    SizeSavings,
} from './size-metrics';

import type { ImageProcessingLimits } from './image-limits';

export type ImageResizeOptions = {
    maxWidth?: number;
    maxHeight?: number;
};

export type ImageProcessingStage =
    | 'queued'
    | 'decoding'
    | 'resizing'
    | 'encoding'
    | 'finalizing'
    | 'completed';

export type ImageProcessingStatus = {
    stage: ImageProcessingStage;
    progress: number | null;
};

export type FileProcessingStatus = ImageProcessingStatus & {
    index: number;
    file: File;
};

export type ImageOptimizationOptions = {
    quality?: number;
    targetSize?: number;
    minQuality?: number;
    resize?: ImageResizeOptions;
    limits?: ImageProcessingLimits;
    signal?: AbortSignal;
    onStatus?: (status: ImageProcessingStatus) => void;
    mode?: ImageOutputMode;
    format?: ImageOutputFormat;
};

export type ImageOptimizationSkipReason =
    | 'output-larger-than-input';

export type FileProcessingClassificationReason =
    | 'non-image'
    | 'unsupported-image-format';

export type FileProcessingFailureReason =
    | ImageOptimizerErrorCode
    | 'optimization-failed';

export type FileProcessingReason =
    | ImageOptimizationSkipReason
    | FileProcessingClassificationReason
    | FileProcessingFailureReason;

export type ImageFileMetadata = {
    name: string;
    type: string;
    size: number;
    width: number;
    height: number;
};

export type ImageCompressionResult = {
    quality?: number;
    encodeAttempts: number;
    targetSize?: number;
    targetReached?: boolean;
};

export type ImageOptimizationTiming = {
    totalMs: number;
    decodeMs: number;
    resizeMs: number;
    encodeMs: number;
};

export type ImageOptimizationResult = {
    file: File;
    optimized: boolean;
    converted: boolean;
    changed: boolean;
    reason?: ImageOptimizationSkipReason;

    original: ImageFileMetadata;
    output: ImageFileMetadata;

    compression: ImageCompressionResult;

    savings: SizeSavings;
    sizeChange: SizeChange;

    timing: ImageOptimizationTiming;
};

export type FileProcessingOutcome =
    | 'optimized'
    | 'changed'
    | 'unchanged'
    | 'failed-passthrough';

export type FileProcessingKind =
    | 'image'
    | 'passthrough';

export type FileProcessingItemResult = {
    index: number;
    originalFile: File;
    file: File;
    kind: FileProcessingKind;
    outcome: FileProcessingOutcome;
    reason?: FileProcessingReason;
    optimization?: ImageOptimizationResult;
    error?: ImageOptimizerError;
};

export type FileProcessingBatchSummary = {
    totalFiles: number;
    imageFiles: number;
    optimizedFiles: number;
    changedFiles: number;
    unchangedFiles: number;
    failedOptimizations: number;
    originalBytes: number;
    outputBytes: number;
    savings: SizeSavings;
    sizeChange: SizeChange;
};

export type FileProcessingBatchResult = {
    files: File[];
    items: FileProcessingItemResult[];
    summary: FileProcessingBatchSummary;
};

export type FileProcessingErrorMode =
    | 'passthrough'
    | 'throw';

export type ProcessFilesOptions = Omit<
    ImageOptimizationOptions,
    'onStatus'
> & {
    errorMode?: FileProcessingErrorMode;
    concurrency?: number;
    onStatus?: (status: FileProcessingStatus) => void;
};

export type ImageOutputFormat =
    | 'jpeg'
    | 'png'
    | 'webp';

export type ImageOutputMode =
    | 'original'
    | 'format'
    | 'auto';