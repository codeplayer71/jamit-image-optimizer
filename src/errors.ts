export type ImageOptimizerErrorCode =
    | 'unsupported-format'
    | 'codec-not-supported'
    | 'transparency-not-supported'
    | 'resource-limit-exceeded'
    | 'invalid-options'
    | 'browser-not-supported'
    | 'worker-failed'
    | 'aborted';

export class ImageOptimizerError extends Error {
    readonly code: ImageOptimizerErrorCode;

    constructor(code: ImageOptimizerErrorCode, message: string) {
        super(message);

        this.name = 'ImageOptimizerError';
        this.code = code;
    }
}

export function isImageOptimizerError(
    error: unknown,
): error is ImageOptimizerError {
    return (
        error instanceof Error &&
        error.name === 'ImageOptimizerError' &&
        'code' in error
    );
}