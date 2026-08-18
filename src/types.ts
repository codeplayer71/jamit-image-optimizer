export type ImageResizeOptions = {
    maxWidth?: number;
    maxHeight?: number;
};

export type ImageOptimizationOptions = {
    quality?: number;
    resize?: ImageResizeOptions;
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