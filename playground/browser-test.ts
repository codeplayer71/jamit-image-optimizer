import { optimizeImage } from '../src';

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

declare global {
    interface Window {
        runImageOptimizationTest:
            () => Promise<BrowserOptimizationResult>;
    }
}

window.runImageOptimizationTest =
    async (): Promise<BrowserOptimizationResult> => {
        const canvas =
            document.createElement('canvas');

        canvas.width = 64;
        canvas.height = 48;

        const context =
            canvas.getContext('2d');

        if (!context) {
            throw new Error(
                'Canvas 2D context is unavailable.',
            );
        }

        context.fillStyle = '#ff0000';

        context.fillRect(
            0,
            0,
            canvas.width,
            canvas.height,
        );

        const blob = await new Promise<Blob>(
            (resolve, reject) => {
                canvas.toBlob(
                    (result) => {
                        if (!result) {
                            reject(
                                new Error(
                                    'Failed to create JPEG test image.',
                                ),
                            );

                            return;
                        }

                        resolve(result);
                    },
                    'image/jpeg',
                    0.95,
                );
            },
        );

        const file = new File(
            [blob],
            'browser-test.jpg',
            {
                type: 'image/jpeg',
            },
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