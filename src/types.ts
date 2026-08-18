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

export type ImageOptimizationOptions = {
    quality?: number;
    targetSize?: number;
    minQuality?: number;
    resize?: ImageResizeOptions;
    signal?: AbortSignal;
    onStatus?: (status: ImageProcessingStatus) => void;
};

export type ImageOptimizationSkipReason =
    | 'output-larger-than-input';

export type ImageOptimizationResult = {
    file: File;
    optimized: boolean;
    reason?: ImageOptimizationSkipReason;

    original: {
        name: string;
        type: string;
        size: number;
        width: number;
        height: number;
    };

    output: {
        name: string;
        type: string;
        size: number;
        width: number;
        height: number;
    };

    compression: {
        quality: number;
        encodeAttempts: number;
        targetSize?: number;
        targetReached?: boolean;
    };

    savings: {
        bytes: number;
        ratio: number;
        percent: number;
    };

    timing: {
        totalMs: number;
        decodeMs: number;
        resizeMs: number;
        encodeMs: number;
    };
};