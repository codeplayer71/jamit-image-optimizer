import {
    isImageOptimizerError,
    processFiles,
} from '../src';

import type {
    FileProcessingBatchResult,
    FileProcessingItemResult,
    ImageOptimizationOptions,
    ImageOutputFormat,
    ImageOutputMode,
    ProcessFilesOptions,
} from '../src';

type FileStatusState =
    | 'idle'
    | 'processing'
    | 'success'
    | 'neutral'
    | 'error';

const fileInput =
    queryRequiredElement<HTMLInputElement>(
        '#file-input',
    );

const dropZone =
    queryRequiredElement<HTMLDivElement>(
        '#drop-zone',
    );

const chooseFilesButton =
    queryRequiredElement<HTMLLabelElement>(
        '#choose-files-button',
    );

const optimizeButton =
    queryRequiredElement<HTMLButtonElement>(
        '#optimize-button',
    );

const cancelButton =
    queryRequiredElement<HTMLButtonElement>(
        '#cancel-button',
    );

const resetButton =
    queryRequiredElement<HTMLButtonElement>(
        '#reset-button',
    );

const processingStatus =
    queryRequiredElement<HTMLSpanElement>(
        '#processing-status',
    );

const selectionHint =
    queryRequiredElement<HTMLSpanElement>(
        '#selection-hint',
    );

const errorBanner =
    queryRequiredElement<HTMLDivElement>(
        '#error-banner',
    );

const errorTitle =
    queryRequiredElement<HTMLElement>(
        '#error-title',
    );

const errorMessage =
    queryRequiredElement<HTMLParagraphElement>(
        '#error-message',
    );

const errorCode =
    queryRequiredElement<HTMLElement>(
        '#error-code',
    );

const selectedFilesElement =
    queryRequiredElement<HTMLDivElement>(
        '#selected-files',
    );

const selectedFilesSummary =
    queryRequiredElement<HTMLSpanElement>(
        '#selected-files-summary',
    );

const selectedFilesList =
    queryRequiredElement<HTMLUListElement>(
        '#selected-files-list',
    );

const resultsSection =
    queryRequiredElement<HTMLElement>(
        '#results-section',
    );

const batchSummary =
    queryRequiredElement<HTMLDivElement>(
        '#batch-summary',
    );

const resultList =
    queryRequiredElement<HTMLDivElement>(
        '#result-list',
    );

const resultElement =
    queryRequiredElement<HTMLPreElement>(
        '#result',
    );

const copyResultButton =
    queryRequiredElement<HTMLButtonElement>(
        '#copy-result-button',
    );

const outputPreview =
    queryRequiredElement<HTMLImageElement>(
        '#output-preview',
    );

const previewToolbar =
    queryRequiredElement<HTMLDivElement>(
        '#preview-toolbar',
    );

const previewFileName =
    queryRequiredElement<HTMLSpanElement>(
        '#preview-file-name',
    );

const previewFileMeta =
    queryRequiredElement<HTMLSpanElement>(
        '#preview-file-meta',
    );

const previewDownloadButton =
    queryRequiredElement<HTMLAnchorElement>(
        '#preview-download-button',
    );

const modeInput =
    queryRequiredElement<HTMLSelectElement>(
        '#mode-input',
    );

const formatInput =
    queryRequiredElement<HTMLSelectElement>(
        '#format-input',
    );

const qualityInput =
    queryRequiredElement<HTMLInputElement>(
        '#quality-input',
    );

const targetSizeInput =
    queryRequiredElement<HTMLInputElement>(
        '#target-size-input',
    );

const minQualityInput =
    queryRequiredElement<HTMLInputElement>(
        '#min-quality-input',
    );

const maxWidthInput =
    queryRequiredElement<HTMLInputElement>(
        '#max-width-input',
    );

const maxHeightInput =
    queryRequiredElement<HTMLInputElement>(
        '#max-height-input',
    );

const concurrencyInput =
    queryRequiredElement<HTMLSelectElement>(
        '#concurrency-input',
    );

const settingsControls = [
    modeInput,
    formatInput,
    qualityInput,
    targetSizeInput,
    minQualityInput,
    maxWidthInput,
    maxHeightInput,
    concurrencyInput,
];

const fileStatusElements =
    new Map<number, HTMLSpanElement>();

const outputUrls =
    new Map<number, string>();

const resultCardElements =
    new Map<number, HTMLDivElement>();

const previewButtonElements =
    new Map<number, HTMLButtonElement>();

let activeController: AbortController | null = null;
let selectedFiles: File[] = [];
let previewedIndex: number | null = null;
let copyFeedbackTimeout: ReturnType<typeof setTimeout> | null = null;

syncConditionalControls();

modeInput.addEventListener(
    'change',
    syncConditionalControls,
);

formatInput.addEventListener(
    'change',
    syncConditionalControls,
);

targetSizeInput.addEventListener(
    'input',
    syncConditionalControls,
);

fileInput.addEventListener(
    'change',
    () => {
        setSelectedFiles(
            fileInput.files
                ? Array.from(fileInput.files)
                : [],
        );
    },
);

dropZone.addEventListener(
    'dragenter',
    (event) => {
        event.preventDefault();

        if (activeController) {
            return;
        }

        dropZone.classList.add(
            'is-dragging',
        );
    },
);

dropZone.addEventListener(
    'dragover',
    (event) => {
        event.preventDefault();

        if (activeController) {
            return;
        }

        if (event.dataTransfer) {
            event.dataTransfer.dropEffect =
                'copy';
        }

        dropZone.classList.add(
            'is-dragging',
        );
    },
);

dropZone.addEventListener(
    'dragleave',
    (event) => {
        if (
            event.relatedTarget instanceof Node &&
            dropZone.contains(
                event.relatedTarget,
            )
        ) {
            return;
        }

        dropZone.classList.remove(
            'is-dragging',
        );
    },
);

dropZone.addEventListener(
    'drop',
    (event) => {
        event.preventDefault();

        dropZone.classList.remove(
            'is-dragging',
        );

        if (activeController) {
            return;
        }

        const files =
            event.dataTransfer?.files;

        if (!files?.length) {
            return;
        }

        fileInput.value = '';

        setSelectedFiles(
            Array.from(files),
        );
    },
);

document.addEventListener(
    'dragover',
    (event) => {
        event.preventDefault();
    },
);

document.addEventListener(
    'drop',
    (event) => {
        event.preventDefault();
    },
);

cancelButton.addEventListener(
    'click',
    () => {
        activeController?.abort();
    },
);

resetButton.addEventListener(
    'click',
    () => {
        resetPlayground();
    },
);

copyResultButton.addEventListener(
    'click',
    async () => {
        const text =
            resultElement.textContent?.trim();

        if (!text) {
            return;
        }

        try {
            await navigator.clipboard.writeText(
                text,
            );

            showCopyFeedback();
        } catch (error) {
            console.error(
                error,
            );

            showError(
                'Could not copy result',
                'The browser did not allow access to the clipboard. You can still select and copy the technical result manually.',
            );
        }
    },
);

optimizeButton.addEventListener(
    'click',
    async () => {
        if (
            selectedFiles.length === 0 ||
            activeController
        ) {
            return;
        }

        hideError();

        let options: ProcessFilesOptions;

        try {
            options =
                readProcessingOptions();
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : String(error);

            processingStatus.textContent =
                'Invalid settings';

            setTechnicalResult(
                message,
            );

            showError(
                'Invalid optimization settings',
                message,
            );

            return;
        }

        const controller =
            new AbortController();

        activeController =
            controller;

        setProcessingState(
            true,
        );

        clearPreview();
        clearResults();

        setTechnicalResult(
            'Processing...',
        );

        processingStatus.textContent =
            'Preparing';

        for (
            let index = 0;
            index < selectedFiles.length;
            index += 1
        ) {
            setFileStatus(
                index,
                'Queued',
                'processing',
            );
        }

        try {
            const result =
                await processFiles(
                    selectedFiles,
                    {
                        ...options,
                        signal:
                        controller.signal,
                        onStatus(status) {
                            const stage =
                                formatStage(
                                    status.stage,
                                );

                            processingStatus.textContent =
                                `${status.file.name}: ${stage}`;

                            setFileStatus(
                                status.index,
                                stage,
                                status.stage ===
                                'completed'
                                    ? 'success'
                                    : 'processing',
                            );
                        },
                    },
                );

            updateFileStatuses(
                result,
            );

            renderResults(
                result,
            );

            setTechnicalResult(
                JSON.stringify(
                    createSerializableResult(
                        result,
                        options,
                    ),
                    null,
                    2,
                ),
            );

            processingStatus.textContent =
                'Completed';
        } catch (error) {
            console.error(
                error,
            );

            if (
                isImageOptimizerError(
                    error,
                )
            ) {
                const cancelled =
                    error.code ===
                    'aborted';

                processingStatus.textContent =
                    cancelled
                        ? 'Cancelled'
                        : 'Failed';

                setTechnicalResult(
                    `${error.code}: ${error.message}`,
                );

                setAllFileStatuses(
                    cancelled
                        ? 'Cancelled'
                        : 'Failed',
                    cancelled
                        ? 'neutral'
                        : 'error',
                );

                if (cancelled) {
                    hideError();

                    return;
                }

                showError(
                    getErrorTitle(
                        error.code,
                    ),
                    getErrorDescription(
                        error.code,
                        error.message,
                    ),
                    error.code,
                );

                return;
            }

            processingStatus.textContent =
                'Failed';

            const message =
                error instanceof Error
                    ? error.message
                    : String(error);

            setTechnicalResult(
                message,
            );

            setAllFileStatuses(
                'Failed',
                'error',
            );

            showError(
                'Unexpected processing error',
                message,
            );
        } finally {
            if (
                activeController ===
                controller
            ) {
                activeController =
                    null;

                setProcessingState(
                    false,
                );
            }
        }
    },
);

function resetPlayground(): void {
    if (activeController) {
        return;
    }

    fileInput.value =
        '';

    modeInput.value =
        'auto';

    formatInput.value =
        'webp';

    qualityInput.value =
        '85';

    targetSizeInput.value =
        '500';

    minQualityInput.value =
        '50';

    maxWidthInput.value =
        '1920';

    maxHeightInput.value =
        '1920';

    concurrencyInput.value =
        '2';

    processingStatus.textContent =
        'Idle';

    hideError();

    setSelectedFiles([]);

    syncConditionalControls();
}

function setSelectedFiles(
    files: File[],
): void {
    selectedFiles =
        files;

    optimizeButton.disabled =
        selectedFiles.length ===
        0;

    selectionHint.textContent =
        selectedFiles.length ===
        0
            ? 'No files selected'
            : selectedFiles.length ===
            1
                ? '1 file selected'
                : `${selectedFiles.length} files selected`;

    processingStatus.textContent =
        'Idle';

    clearTechnicalResult();

    hideError();
    clearPreview();
    clearResults();

    renderSelectedFiles();
}

function renderSelectedFiles(): void {
    selectedFilesList.replaceChildren();

    fileStatusElements.clear();

    const hasFiles =
        selectedFiles.length >
        0;

    selectedFilesElement.classList.toggle(
        'has-files',
        hasFiles,
    );

    if (!hasFiles) {
        selectedFilesSummary.textContent =
            '';

        return;
    }

    const totalBytes =
        selectedFiles.reduce(
            (
                total,
                file,
            ) =>
                total +
                file.size,
            0,
        );

    selectedFilesSummary.textContent =
        `${selectedFiles.length} ${
            selectedFiles.length ===
            1
                ? 'file'
                : 'files'
        } · ${formatBytes(
            totalBytes,
        )}`;

    for (
        let index = 0;
        index <
        selectedFiles.length;
        index += 1
    ) {
        const file =
            selectedFiles[
                index
                ];

        if (!file) {
            continue;
        }

        const item =
            document.createElement(
                'li',
            );

        item.className =
            'selected-file';

        const main =
            document.createElement(
                'div',
            );

        main.className =
            'selected-file-main';

        const icon =
            createFileIcon();

        const info =
            document.createElement(
                'div',
            );

        info.className =
            'selected-file-info';

        const name =
            document.createElement(
                'p',
            );

        name.className =
            'selected-file-name';

        name.textContent =
            file.name;

        name.title =
            file.name;

        const meta =
            document.createElement(
                'p',
            );

        meta.className =
            'selected-file-meta';

        meta.textContent =
            `${file.type || 'Unknown type'} · ${formatBytes(
                file.size,
            )}`;

        info.append(
            name,
            meta,
        );

        main.append(
            icon,
            info,
        );

        const status =
            document.createElement(
                'span',
            );

        status.className =
            'file-status';

        status.dataset.state =
            'idle';

        status.textContent =
            'Ready';

        fileStatusElements.set(
            index,
            status,
        );

        item.append(
            main,
            status,
        );

        selectedFilesList.append(
            item,
        );
    }
}

function updateFileStatuses(
    result: FileProcessingBatchResult,
): void {
    for (
        const item of
        result.items
        ) {
        const status =
            getResultStatus(
                item,
            );

        setFileStatus(
            item.index,
            status.label,
            status.state,
        );
    }
}

function renderResults(
    result: FileProcessingBatchResult,
): void {
    resultsSection.hidden =
        false;

    renderBatchSummary(
        result,
    );

    resultList.replaceChildren();

    resultCardElements.clear();
    previewButtonElements.clear();

    for (
        const item of
        result.items
        ) {
        resultList.append(
            createResultCard(
                item,
            ),
        );
    }

    const firstPreviewable =
        result.items.find(
            (item) =>
                item.kind ===
                'image' &&
                item.optimization !==
                undefined,
        );

    if (
        firstPreviewable
    ) {
        selectPreview(
            firstPreviewable,
        );
    }
}

function renderBatchSummary(
    result: FileProcessingBatchResult,
): void {
    batchSummary.replaceChildren();

    const summary =
        result.summary;

    batchSummary.append(
        createSummaryCard(
            'Files',
            String(
                summary.totalFiles,
            ),
        ),
        createSummaryCard(
            'Images',
            String(
                summary.imageFiles,
            ),
        ),
        createSummaryCard(
            'Original size',
            formatBytes(
                summary.originalBytes,
            ),
        ),
        createSummaryCard(
            'Output size',
            formatBytes(
                summary.outputBytes,
            ),
        ),
        createSummaryCard(
            'Saved',
            `${round(
                summary.savings
                    .percent,
            )}%`,
            summary.savings.bytes >
            0,
        ),
    );
}

function createSummaryCard(
    label: string,
    value: string,
    positive = false,
): HTMLDivElement {
    const card =
        document.createElement(
            'div',
        );

    card.className =
        'summary-card';

    const labelElement =
        document.createElement(
            'p',
        );

    labelElement.className =
        'summary-label';

    labelElement.textContent =
        label;

    const valueElement =
        document.createElement(
            'p',
        );

    valueElement.className =
        positive
            ? 'summary-value is-positive'
            : 'summary-value';

    valueElement.textContent =
        value;

    card.append(
        labelElement,
        valueElement,
    );

    return card;
}

function createResultCard(
    item: FileProcessingItemResult,
): HTMLDivElement {
    const card =
        document.createElement(
            'div',
        );

    card.className =
        'result-card';

    resultCardElements.set(
        item.index,
        card,
    );

    const header =
        document.createElement(
            'div',
        );

    header.className =
        'result-card-header';

    const name =
        document.createElement(
            'p',
        );

    name.className =
        'result-file-name';

    name.textContent =
        item.originalFile.name;

    name.title =
        item.originalFile.name;

    const end =
        document.createElement(
            'div',
        );

    end.className =
        'result-card-end';

    const status =
        document.createElement(
            'span',
        );

    status.className =
        'result-status';

    const statusInfo =
        getResultStatus(
            item,
        );

    status.textContent =
        statusInfo.label;

    status.dataset.state =
        statusInfo.state;

    end.append(
        status,
    );

    if (
        item.optimization !==
        undefined
    ) {
        end.append(
            createResultActions(
                item,
            ),
        );
    }

    header.append(
        name,
        end,
    );

    const metrics =
        document.createElement(
            'div',
        );

    metrics.className =
        'result-grid';

    if (
        item.optimization !==
        undefined
    ) {
        const optimization =
            item.optimization;

        metrics.append(
            createResultMetric(
                'Format',
                `${formatMimeType(
                    optimization.original.type,
                )} → ${formatMimeType(
                    optimization.output.type,
                )}`,
            ),
            createResultMetric(
                'Size',
                `${formatBytes(
                    optimization.original.size,
                )} → ${formatBytes(
                    optimization.output.size,
                )}`,
            ),
            createResultMetric(
                'Dimensions',
                `${formatDimensions(
                    optimization.original.width,
                    optimization.original.height,
                )} → ${formatDimensions(
                    optimization.output.width,
                    optimization.output.height,
                )}`,
            ),
            createResultMetric(
                'Saved',
                `${round(
                    optimization.savings.percent,
                )}%`,
                optimization.savings.bytes >
                0,
            ),
            createResultMetric(
                'Processing',
                `${Math.round(
                    optimization.timing.totalMs,
                )} ms`,
            ),
        );
    } else {
        metrics.append(
            createResultMetric(
                'Type',
                item.originalFile.type ||
                'Unknown',
            ),
            createResultMetric(
                'Size',
                formatBytes(
                    item.originalFile.size,
                ),
            ),
            createResultMetric(
                'Result',
                formatReason(
                    item.reason,
                ),
            ),
        );
    }

    card.append(
        header,
        metrics,
    );

    return card;
}

function createResultActions(
    item: FileProcessingItemResult,
): HTMLDivElement {
    const actions =
        document.createElement(
            'div',
        );

    actions.className =
        'result-card-actions';

    const previewButton =
        document.createElement(
            'button',
        );

    previewButton.type =
        'button';

    previewButton.className =
        'button button-secondary button-small preview-button';

    previewButton.textContent =
        'Preview';

    previewButton.setAttribute(
        'aria-pressed',
        'false',
    );

    previewButton.addEventListener(
        'click',
        () => {
            selectPreview(
                item,
            );
        },
    );

    previewButtonElements.set(
        item.index,
        previewButton,
    );

    const downloadButton =
        document.createElement(
            'a',
        );

    downloadButton.className =
        'button button-secondary button-small';

    downloadButton.textContent =
        'Download';

    downloadButton.href =
        getOutputUrl(
            item.index,
            item.file,
        );

    downloadButton.download =
        item.file.name;

    actions.append(
        previewButton,
        downloadButton,
    );

    return actions;
}

function createResultMetric(
    label: string,
    value: string,
    saving = false,
): HTMLDivElement {
    const metric =
        document.createElement(
            'div',
        );

    metric.className =
        'result-metric';

    const labelElement =
        document.createElement(
            'p',
        );

    labelElement.className =
        'result-metric-label';

    labelElement.textContent =
        label;

    const valueElement =
        document.createElement(
            'p',
        );

    valueElement.className =
        saving
            ? 'result-metric-value is-saving'
            : 'result-metric-value';

    valueElement.textContent =
        value;

    metric.append(
        labelElement,
        valueElement,
    );

    return metric;
}

function getResultStatus(
    item: FileProcessingItemResult,
): {
    label: string;
    state: FileStatusState;
} {
    if (
        item.kind ===
        'passthrough'
    ) {
        return {
            label:
                'Passthrough',
            state:
                'neutral',
        };
    }

    switch (
        item.outcome
        ) {
        case 'optimized':
            return {
                label:
                    'Optimized',
                state:
                    'success',
            };

        case 'changed':
            return {
                label:
                    'Changed',
                state:
                    'success',
            };

        case 'failed-passthrough':
            return {
                label:
                    'Failed',
                state:
                    'error',
            };

        case 'unchanged':
            return {
                label:
                    'Unchanged',
                state:
                    'neutral',
            };
    }
}

function selectPreview(
    item: FileProcessingItemResult,
): void {
    if (
        item.optimization ===
        undefined
    ) {
        return;
    }

    const url =
        getOutputUrl(
            item.index,
            item.file,
        );

    previewedIndex =
        item.index;

    outputPreview.src =
        url;

    previewToolbar.hidden =
        false;

    previewFileName.textContent =
        item.file.name;

    previewFileMeta.textContent =
        `${formatMimeType(
            item.file.type,
        )} · ${formatBytes(
            item.file.size,
        )}`;

    previewDownloadButton.href =
        url;

    previewDownloadButton.download =
        item.file.name;

    updatePreviewSelection();
}

function updatePreviewSelection(): void {
    for (
        const [
            index,
            card,
        ] of
        resultCardElements
        ) {
        card.classList.toggle(
            'is-previewing',
            index ===
            previewedIndex,
        );
    }

    for (
        const [
            index,
            button,
        ] of
        previewButtonElements
        ) {
        button.setAttribute(
            'aria-pressed',
            index ===
            previewedIndex
                ? 'true'
                : 'false',
        );
    }
}

function getOutputUrl(
    index: number,
    file: File,
): string {
    const existing =
        outputUrls.get(
            index,
        );

    if (existing) {
        return existing;
    }

    const url =
        URL.createObjectURL(
            file,
        );

    outputUrls.set(
        index,
        url,
    );

    return url;
}

function createSerializableResult(
    result: FileProcessingBatchResult,
    options: ProcessFilesOptions,
): Record<string, unknown> {
    return {
        options:
            serializeOptions(
                options,
            ),
        files:
            result.items.map(
                (item) => ({
                    index:
                    item.index,
                    name:
                    item.file.name,
                    type:
                    item.file.type,
                    size:
                    item.file.size,
                    kind:
                    item.kind,
                    outcome:
                    item.outcome,
                    reason:
                        item.reason ??
                        null,
                    ...(
                        item.optimization !==
                        undefined && {
                            original:
                            item.optimization.original,
                            output:
                            item.optimization.output,
                            compression:
                            item.optimization.compression,
                            savings:
                                roundSizeMetrics(
                                    item.optimization.savings,
                                ),
                            sizeChange:
                                roundSizeMetrics(
                                    item.optimization.sizeChange,
                                ),
                            timing: {
                                totalMs:
                                    Math.round(
                                        item.optimization.timing.totalMs,
                                    ),
                                decodeMs:
                                    Math.round(
                                        item.optimization.timing.decodeMs,
                                    ),
                                resizeMs:
                                    Math.round(
                                        item.optimization.timing.resizeMs,
                                    ),
                                encodeMs:
                                    Math.round(
                                        item.optimization.timing.encodeMs,
                                    ),
                            },
                        }
                    ),
                }),
            ),
        summary: {
            ...result.summary,
            savings:
                roundSizeMetrics(
                    result.summary.savings,
                ),
            sizeChange:
                roundSizeMetrics(
                    result.summary.sizeChange,
                ),
        },
    };
}

function setAllFileStatuses(
    label: string,
    state: FileStatusState,
): void {
    for (
        let index = 0;
        index <
        selectedFiles.length;
        index += 1
    ) {
        setFileStatus(
            index,
            label,
            state,
        );
    }
}

function clearResults(): void {
    resultsSection.hidden =
        true;

    batchSummary.replaceChildren();
    resultList.replaceChildren();

    resultCardElements.clear();
    previewButtonElements.clear();
}

function clearPreview(): void {
    for (
        const url of
        outputUrls.values()
        ) {
        URL.revokeObjectURL(
            url,
        );
    }

    outputUrls.clear();

    previewedIndex =
        null;

    outputPreview.removeAttribute(
        'src',
    );

    previewToolbar.hidden =
        true;

    previewFileName.textContent =
        '';

    previewFileMeta.textContent =
        '';

    previewDownloadButton.removeAttribute(
        'href',
    );

    previewDownloadButton.removeAttribute(
        'download',
    );
}

function setTechnicalResult(
    value: string,
): void {
    resultElement.textContent =
        value;

    copyResultButton.disabled =
        value.trim().length ===
        0;

    resetCopyFeedback();
}

function clearTechnicalResult(): void {
    resultElement.textContent =
        '';

    copyResultButton.disabled =
        true;

    resetCopyFeedback();

    resultElement.scrollTop =
        0;

    resultElement.scrollLeft =
        0;
}

function showCopyFeedback(): void {
    resetCopyFeedback();

    copyResultButton.textContent =
        'Copied';

    copyFeedbackTimeout =
        setTimeout(
            () => {
                copyResultButton.textContent =
                    'Copy';

                copyFeedbackTimeout =
                    null;
            },
            1600,
        );
}

function resetCopyFeedback(): void {
    if (
        copyFeedbackTimeout !==
        null
    ) {
        clearTimeout(
            copyFeedbackTimeout,
        );

        copyFeedbackTimeout =
            null;
    }

    copyResultButton.textContent =
        'Copy';
}

function showError(
    title: string,
    message: string,
    code?: string,
): void {
    errorTitle.textContent =
        title;

    errorMessage.textContent =
        message;

    if (code) {
        errorCode.textContent =
            code;

        errorCode.hidden =
            false;
    } else {
        errorCode.textContent =
            '';

        errorCode.hidden =
            true;
    }

    errorBanner.hidden =
        false;

    errorBanner.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
    });
}

function hideError(): void {
    errorBanner.hidden =
        true;

    errorTitle.textContent =
        '';

    errorMessage.textContent =
        '';

    errorCode.textContent =
        '';

    errorCode.hidden =
        true;
}

function getErrorTitle(
    code: string,
): string {
    switch (code) {
        case 'invalid-options':
            return 'Invalid optimization settings';

        case 'unsupported-format':
            return 'Unsupported image format';

        case 'output-format-not-supported':
            return 'Output format is not supported';

        case 'codec-not-supported':
            return 'Browser codec is not available';

        case 'transparency-not-supported':
            return 'Transparency cannot be preserved';

        case 'resource-limit-exceeded':
            return 'Image exceeds the processing limits';

        case 'browser-not-supported':
            return 'Browser is not supported';

        case 'worker-failed':
            return 'Image worker failed';

        default:
            return 'Image processing failed';
    }
}

function getErrorDescription(
    code: string,
    fallback: string,
): string {
    switch (code) {
        case 'codec-not-supported':
            return 'This browser cannot decode the selected image format natively. The file was not processed.';

        case 'output-format-not-supported':
            return 'The input image was recognized, but JamIT Image Optimizer cannot encode the requested output format.';

        case 'transparency-not-supported':
            return 'The requested output format cannot safely preserve the transparency of this image.';

        case 'resource-limit-exceeded':
            return 'The image exceeds one of the configured file-size, pixel-count or dimension limits.';

        case 'browser-not-supported':
            return 'The required browser features for local image processing are not available.';

        default:
            return fallback;
    }
}

function formatReason(
    reason:
        | FileProcessingItemResult['reason']
        | undefined,
): string {
    switch (reason) {
        case 'non-image':
            return 'Non-image file';

        case 'unsupported-image-format':
            return 'Unsupported image format';

        case 'output-format-not-supported':
            return 'Output format not supported';

        case 'codec-not-supported':
            return 'Browser codec not available';

        case 'transparency-not-supported':
            return 'Transparency not supported';

        case 'resource-limit-exceeded':
            return 'Resource limit exceeded';

        case 'output-larger-than-input':
            return 'Original file kept';

        case 'optimization-failed':
            return 'Optimization failed';

        case undefined:
            return 'Unchanged';

        default:
            return reason;
    }
}

function createFileIcon():
    HTMLSpanElement {
    const icon =
        document.createElement(
            'span',
        );

    icon.className =
        'selected-file-icon';

    icon.innerHTML = `
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
        >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <path d="M14 2v6h6" />
        </svg>
    `;

    return icon;
}

function setFileStatus(
    index: number,
    label: string,
    state: FileStatusState,
): void {
    const element =
        fileStatusElements.get(
            index,
        );

    if (!element) {
        return;
    }

    element.textContent =
        label;

    element.dataset.state =
        state;
}

function readProcessingOptions():
    ProcessFilesOptions {
    const mode =
        readOutputMode(
            modeInput.value,
        );

    const format =
        mode === 'format'
            ? readOutputFormat(
                formatInput.value,
            )
            : undefined;

    const pngOutput =
        mode === 'format' &&
        format === 'png';

    const maxWidth =
        readOptionalPositiveInteger(
            maxWidthInput,
            'Max width',
        );

    const maxHeight =
        readOptionalPositiveInteger(
            maxHeightInput,
            'Max height',
        );

    const concurrency =
        readPositiveInteger(
            concurrencyInput.value,
            'Concurrency',
        );

    const resize =
        createResizeOptions(
            maxWidth,
            maxHeight,
        );

    const options:
        ProcessFilesOptions = {
        mode,
        concurrency,
        ...(format !==
            undefined && {
                format,
            }),
        ...(resize !==
            undefined && {
                resize,
            }),
    };

    if (!pngOutput) {
        options.quality =
            readPercentage(
                qualityInput,
                'Quality',
            );

        const targetSizeKiB =
            readOptionalPositiveInteger(
                targetSizeInput,
                'Target size',
            );

        if (
            targetSizeKiB !==
            undefined
        ) {
            options.targetSize =
                targetSizeKiB *
                1024;

            options.minQuality =
                readPercentage(
                    minQualityInput,
                    'Minimum quality',
                );
        }
    }

    return options;
}

function createResizeOptions(
    maxWidth: number | undefined,
    maxHeight: number | undefined,
): ImageOptimizationOptions['resize'] {
    if (
        maxWidth ===
        undefined &&
        maxHeight ===
        undefined
    ) {
        return undefined;
    }

    return {
        ...(maxWidth !==
            undefined && {
                maxWidth,
            }),
        ...(maxHeight !==
            undefined && {
                maxHeight,
            }),
    };
}

function readOutputMode(
    value: string,
): ImageOutputMode {
    if (
        value ===
        'auto' ||
        value ===
        'original' ||
        value ===
        'format'
    ) {
        return value;
    }

    throw new Error(
        'Invalid output mode.',
    );
}

function readOutputFormat(
    value: string,
): ImageOutputFormat {
    if (
        value ===
        'jpeg' ||
        value ===
        'png' ||
        value ===
        'webp'
    ) {
        return value;
    }

    throw new Error(
        'Invalid output format.',
    );
}

function readPercentage(
    input: HTMLInputElement,
    label: string,
): number {
    const value =
        Number(
            input.value,
        );

    if (
        !Number.isFinite(
            value,
        ) ||
        value <= 0 ||
        value > 100
    ) {
        throw new Error(
            `${label} must be between 1 and 100.`,
        );
    }

    return value / 100;
}

function readOptionalPositiveInteger(
    input: HTMLInputElement,
    label: string,
): number | undefined {
    const rawValue =
        input.value.trim();

    if (!rawValue) {
        return undefined;
    }

    return readPositiveInteger(
        rawValue,
        label,
    );
}

function readPositiveInteger(
    rawValue: string,
    label: string,
): number {
    const value =
        Number(
            rawValue,
        );

    if (
        !Number.isSafeInteger(
            value,
        ) ||
        value <= 0
    ) {
        throw new Error(
            `${label} must be a positive integer.`,
        );
    }

    return value;
}

function syncConditionalControls(): void {
    const processing =
        activeController !==
        null;

    const formatMode =
        modeInput.value ===
        'format';

    const pngOutput =
        formatMode &&
        formatInput.value ===
        'png';

    formatInput.disabled =
        processing ||
        !formatMode;

    qualityInput.disabled =
        processing ||
        pngOutput;

    targetSizeInput.disabled =
        processing ||
        pngOutput;

    minQualityInput.disabled =
        processing ||
        pngOutput ||
        targetSizeInput.value.trim() ===
        '';

    maxWidthInput.disabled =
        processing;

    maxHeightInput.disabled =
        processing;

    concurrencyInput.disabled =
        processing;

    modeInput.disabled =
        processing;
}

function setProcessingState(
    processing: boolean,
): void {
    fileInput.disabled =
        processing;

    dropZone.classList.toggle(
        'is-disabled',
        processing,
    );

    chooseFilesButton.style.pointerEvents =
        processing
            ? 'none'
            : '';

    chooseFilesButton.style.opacity =
        processing
            ? '0.4'
            : '';

    optimizeButton.disabled =
        processing ||
        selectedFiles.length ===
        0;

    cancelButton.disabled =
        !processing;

    resetButton.disabled =
        processing;

    for (
        const control of
        settingsControls
        ) {
        control.disabled =
            processing;
    }

    if (!processing) {
        syncConditionalControls();
    }
}

function serializeOptions(
    options: ProcessFilesOptions,
): Record<string, unknown> {
    return {
        mode:
        options.mode,
        ...(
            options.format !==
            undefined && {
                format:
                options.format,
            }
        ),
        ...(
            options.quality !==
            undefined && {
                quality:
                options.quality,
            }
        ),
        ...(
            options.targetSize !==
            undefined && {
                targetSize:
                options.targetSize,
            }
        ),
        ...(
            options.minQuality !==
            undefined && {
                minQuality:
                options.minQuality,
            }
        ),
        ...(
            options.resize !==
            undefined && {
                resize:
                options.resize,
            }
        ),
        concurrency:
        options.concurrency,
    };
}

function roundSizeMetrics<
    T extends {
        bytes: number;
        ratio: number;
        percent: number;
    },
>(
    metrics: T,
): T {
    return {
        ...metrics,
        ratio:
            round(
                metrics.ratio,
            ),
        percent:
            round(
                metrics.percent,
            ),
    };
}

function formatMimeType(
    type: string,
): string {
    switch (type) {
        case 'image/jpeg':
            return 'JPEG';

        case 'image/png':
            return 'PNG';

        case 'image/webp':
            return 'WebP';

        case 'image/heic':
            return 'HEIC';

        case 'image/heif':
            return 'HEIF';

        default:
            return (
                type ||
                'Unknown'
            );
    }
}

function formatDimensions(
    width: number,
    height: number,
): string {
    return `${width} × ${height}`;
}

function formatStage(
    stage: string,
): string {
    return stage
        .replace(
            /-/g,
            ' ',
        )
        .replace(
            /^\w/,
            (character) =>
                character.toUpperCase(),
        );
}

function formatBytes(
    bytes: number,
): string {
    if (
        bytes < 1024
    ) {
        return `${bytes} B`;
    }

    const kib =
        bytes / 1024;

    if (
        kib < 1024
    ) {
        return `${round(
            kib,
        )} KiB`;
    }

    const mib =
        kib / 1024;

    return `${round(
        mib,
    )} MiB`;
}

function round(
    value: number,
): number {
    return (
        Math.round(
            value * 100,
        ) / 100
    );
}

function queryRequiredElement<
    T extends Element,
>(
    selector: string,
): T {
    const element =
        document.querySelector<T>(
            selector,
        );

    if (!element) {
        throw new Error(
            `Required playground element not found: ${selector}`,
        );
    }

    return element;
}