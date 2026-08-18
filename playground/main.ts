import { optimizeImage } from '../src';

const fileInput = document.querySelector<HTMLInputElement>('#file-input');
const resultElement = document.querySelector<HTMLPreElement>('#result');
const outputPreview =
    document.querySelector<HTMLImageElement>('#output-preview');

if (!fileInput || !resultElement || !outputPreview) {
    throw new Error('Required playground elements not found.');
}

let outputUrl: string | null = null;

fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];

    if (!file) {
        return;
    }

    resultElement.textContent = 'Processing...';

    try {
        const result = await optimizeImage(file, {
            quality: 0.75,
        });

        if (outputUrl) {
            URL.revokeObjectURL(outputUrl);
        }

        outputUrl = URL.createObjectURL(result.file);
        outputPreview.src = outputUrl;

        resultElement.textContent = JSON.stringify(
            {
                optimized: result.optimized,
                reason: result.reason ?? null,
                original: result.original,
                output: result.output,
                savings: {
                    bytes: result.savings.bytes,
                    ratio: result.savings.ratio,
                    percent: Math.round(result.savings.percent * 100) / 100,
                },
                timing: {
                    totalMs: Math.round(result.timing.totalMs),
                    decodeMs: Math.round(result.timing.decodeMs),
                    encodeMs: Math.round(result.timing.encodeMs),
                },
            },
            null,
            2,
        );
    } catch (error) {
        console.error(error);

        resultElement.textContent =
            error instanceof Error ? error.message : String(error);
    }
});