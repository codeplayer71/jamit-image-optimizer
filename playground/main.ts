type WorkerResult = {
    buffer: ArrayBuffer;
    width: number;
    height: number;
    decodeMs: number;
    encodeMs: number;
};

const fileInput = document.querySelector<HTMLInputElement>('#file-input');
const resultElement = document.querySelector<HTMLPreElement>('#result');
const outputPreview =
    document.querySelector<HTMLImageElement>('#output-preview');

if (!fileInput || !resultElement || !outputPreview) {
    throw new Error('Required playground elements not found.');
}

let outputUrl: string | null = null;

const worker = new Worker(
    new URL('./image-worker.ts', import.meta.url),
    {
        type: 'module',
    },
);

function processImage(buffer: ArrayBuffer): Promise<WorkerResult> {
    return new Promise((resolve, reject) => {
        worker.onmessage = (event: MessageEvent<WorkerResult>) => {
            resolve(event.data);
        };

        worker.onerror = (event) => {
            reject(new Error(event.message || 'Image worker failed.'));
        };

        worker.postMessage(
            { buffer },
            [buffer],
        );
    });
}

fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];

    if (!file) {
        return;
    }

    resultElement.textContent = 'Processing...';

    try {
        const inputBuffer = await file.arrayBuffer();

        const startedAt = performance.now();
        const workerResult = await processImage(inputBuffer);
        const processingMs = performance.now() - startedAt;

        const outputFile = new File([workerResult.buffer], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now(),
        });

        if (outputUrl) {
            URL.revokeObjectURL(outputUrl);
        }

        outputUrl = URL.createObjectURL(outputFile);
        outputPreview.src = outputUrl;

        resultElement.textContent = JSON.stringify(
            {
                input: {
                    name: file.name,
                    type: file.type,
                    size: file.size,
                },
                decoded: {
                    width: workerResult.width,
                    height: workerResult.height,
                },
                output: {
                    name: outputFile.name,
                    type: outputFile.type,
                    size: outputFile.size,
                },
                savedBytes: file.size - outputFile.size,
                decodeMs: Math.round(workerResult.decodeMs),
                encodeMs: Math.round(workerResult.encodeMs),
                processingMs: Math.round(processingMs),
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