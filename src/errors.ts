export type ImageOptimizerErrorCode =
    | 'unsupported-format'
    | 'invalid-options'
    | 'browser-not-supported'
    | 'worker-failed';

export class ImageOptimizerError extends Error {
    readonly code: ImageOptimizerErrorCode;

    constructor(code: ImageOptimizerErrorCode, message: string) {
        super(message);

        this.name = 'ImageOptimizerError';
        this.code = code;
    }
}