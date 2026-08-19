import { processFiles } from '../src';
import { probeHeicCapabilities } from '../src/heic-capabilities';

const fileInput = document.querySelector<HTMLInputElement>('#file-input');
const cancelButton =
    document.querySelector<HTMLButtonElement>('#cancel-button');
const processingStatus =
    document.querySelector<HTMLSpanElement>('#processing-status');
const resultElement = document.querySelector<HTMLPreElement>('#result');
const outputPreview =
    document.querySelector<HTMLImageElement>('#output-preview');

if (
    !fileInput ||
    !cancelButton ||
    !processingStatus ||
    !resultElement ||
    !outputPreview
) {
    throw new Error('Required playground elements not found.');
}

let outputUrl: string | null = null;
let activeController: AbortController | null = null;

cancelButton.addEventListener('click', () => {
    activeController?.abort();
});

fileInput.addEventListener('change', async () => {
    const files = fileInput.files;

    if (!files?.length) {
        return;
    }

    const selectedFiles = Array.from(files);

    activeController?.abort();

    const controller = new AbortController();

    activeController = controller;
    cancelButton.disabled = false;
    resultElement.textContent = 'Processing...';

    try {
        const heicFiles = selectedFiles.filter(
            (file) =>
                file.type === 'image/heic' ||
                file.type === 'image/heif',
        );

        const heicCapabilities = await Promise.all(
            heicFiles.map(async (file) => ({
                name: file.name,
                capabilities: await probeHeicCapabilities(file),
            })),
        );

        const result = await processFiles(selectedFiles, {
            quality: 0.85,
            targetSize: 500_000,
            minQuality: 0.5,
            resize: {
                maxWidth: 1920,
                maxHeight: 1920,
            },
            concurrency: 2,
            signal: controller.signal,
            onStatus(status) {
                processingStatus.textContent = status.stage;
            },
        });

        if (outputUrl) {
            URL.revokeObjectURL(outputUrl);
            outputUrl = null;
        }

        const firstImage = result.items.find(
            (item) => item.kind === 'image' && item.optimization,
        );

        if (firstImage) {
            outputUrl = URL.createObjectURL(firstImage.file);
            outputPreview.src = outputUrl;
        } else {
            outputPreview.removeAttribute('src');
        }

        resultElement.textContent = JSON.stringify(
            {
                files: result.items.map((item) => ({
                    index: item.index,
                    name: item.file.name,
                    type: item.file.type,
                    size: item.file.size,
                    kind: item.kind,
                    outcome: item.outcome,
                    reason: item.reason ?? null,
                    ...(item.optimization && {
                        original: item.optimization.original,
                        output: item.optimization.output,
                        compression: item.optimization.compression,
                        timing: {
                            totalMs: Math.round(
                                item.optimization.timing.totalMs,
                            ),
                            decodeMs: Math.round(
                                item.optimization.timing.decodeMs,
                            ),
                            resizeMs: Math.round(
                                item.optimization.timing.resizeMs,
                            ),
                            encodeMs: Math.round(
                                item.optimization.timing.encodeMs,
                            ),
                        },
                    }),
                })),
                summary: {
                    ...result.summary,
                    savedPercent:
                        Math.round(
                            result.summary.savedPercent * 100,
                        ) / 100,
                },
                heicCapabilities,
            },
            null,
            2,
        );
    } catch (error) {
        console.error(error);

        resultElement.textContent =
            error instanceof Error
                ? error.message
                : String(error);
    } finally {
        if (activeController === controller) {
            activeController = null;
            cancelButton.disabled = true;
            processingStatus.textContent = 'Idle';
        }
    }
});