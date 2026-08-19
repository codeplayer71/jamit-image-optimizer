# jamit-image-optimizer

Framework-independent, TypeScript-first image optimization for browser uploads.

## Live Demo

Try the interactive demo and test image optimization directly in your browser:

**https://jamit.one/packages/jamit-image-optimizer**

`jamit-image-optimizer` processes browser `File` objects locally before they are uploaded. Images can be resized, compressed and converted using Web Workers and WebAssembly, while non-image files can remain unchanged in the same batch.

The package does not upload files and does not require a backend.

## Features

- Browser `File` in, browser `File` out
- Framework-independent TypeScript API
- Local browser processing
- Web Worker based processing
- WebAssembly image codecs
- JPEG, PNG and WebP processing
- Native HEIC / HEIF decoding where supported by the browser
- Resize by maximum width and height
- JPEG / WebP quality control
- Target file size compression
- Minimum quality limit
- Automatic WebP optimization mode
- Explicit output format conversion
- Skip output when optimization would make the file larger
- Mixed file batches
- Stable file ordering
- Non-image passthrough
- Controlled batch concurrency
- `AbortSignal` support
- Processing status callbacks
- Resource limits for large images
- Detailed metadata and timing results
- Typed errors
- SSR-safe package import

## Installation

```bash
pnpm add jamit-image-optimizer
```

or:

```bash
npm install jamit-image-optimizer
```

or:

```bash
yarn add jamit-image-optimizer
```

## Quick start

```ts
import { optimizeImage } from 'jamit-image-optimizer';

const result = await optimizeImage(file, {
    mode: 'auto',
    quality: 0.85,
    resize: {
        maxWidth: 1920,
        maxHeight: 1920,
    },
});

console.log(result.file);
console.log(result.savings.percent);
```

`result.file` is a normal browser `File` and can be passed directly to your existing upload code.

```ts
const formData = new FormData();

formData.append('file', result.file);

await fetch('/upload', {
    method: 'POST',
    body: formData,
});
```

## Single image optimization

The primary single-image API is:

```ts
optimizeImage(
    file: File,
    options?: ImageOptimizationOptions,
): Promise<ImageOptimizationResult>
```

Example:

```ts
import { optimizeImage } from 'jamit-image-optimizer';

const result = await optimizeImage(file, {
    quality: 0.8,
    resize: {
        maxWidth: 1920,
        maxHeight: 1920,
    },
});

console.log({
    optimized: result.optimized,
    changed: result.changed,
    converted: result.converted,
    originalSize: result.original.size,
    outputSize: result.output.size,
    savedBytes: result.savings.bytes,
    savedPercent: result.savings.percent,
});
```

## Output modes

Three output modes are available:

```ts
type ImageOutputMode =
    | 'original'
    | 'format'
    | 'auto';
```

### `original`

Keeps the original image format where the format can be encoded by the optimizer.

```ts
const result = await optimizeImage(file, {
    mode: 'original',
    quality: 0.8,
});
```

Typical examples:

```text
JPEG -> JPEG
PNG  -> PNG
WebP -> WebP
```

This is the default mode.

### `format`

Forces a specific supported output format.

```ts
const result = await optimizeImage(file, {
    mode: 'format',
    format: 'webp',
    quality: 0.85,
});
```

Supported output formats:

```ts
type ImageOutputFormat =
    | 'jpeg'
    | 'png'
    | 'webp';
```

Examples:

```text
JPEG -> WebP
PNG  -> WebP
WebP -> JPEG
JPEG -> PNG
```

A forced format conversion can produce a file that is larger than the original. In `format` mode the requested conversion is intentional, so a changed output can still be returned.

### `auto`

Automatically tries WebP as an optimization candidate.

```ts
const result = await optimizeImage(file, {
    mode: 'auto',
    quality: 0.85,
});
```

If the WebP result is smaller and safe to use, it is returned.

If it is not beneficial, the original file is kept.

`auto` is useful for upload pipelines where reducing transfer size matters more than preserving the original image format.

## Resize

Images can be resized before encoding.

```ts
const result = await optimizeImage(file, {
    resize: {
        maxWidth: 1920,
        maxHeight: 1920,
    },
});
```

The aspect ratio is preserved.

Images are not intentionally upscaled beyond their source dimensions.

You can provide only one dimension:

```ts
const result = await optimizeImage(file, {
    resize: {
        maxWidth: 1600,
    },
});
```

or:

```ts
const result = await optimizeImage(file, {
    resize: {
        maxHeight: 1600,
    },
});
```

Resize dimensions must be positive integers.

## Quality

JPEG and WebP encoding support quality control.

```ts
const result = await optimizeImage(file, {
    quality: 0.8,
});
```

The value must be greater than `0` and less than or equal to `1`.

Examples:

```text
0.9  -> high quality
0.8  -> default quality
0.6  -> stronger compression
```

The default quality is:

```text
0.8
```

PNG processing is lossless and does not use JPEG / WebP quality in the same way.

## Target file size

For quality-based formats you can ask the optimizer to search for a quality level that attempts to reach a target file size.

```ts
const result = await optimizeImage(file, {
    quality: 0.9,
    targetSize: 500 * 1024,
    minQuality: 0.5,
});
```

`targetSize` is specified in bytes.

In this example the optimizer starts from a maximum quality of `0.9` and can reduce quality down to `0.5`.

The result exposes information about the search:

```ts
console.log(result.compression);
```

Example:

```ts
{
    quality: 0.784375,
    encodeAttempts: 6,
    targetSize: 512000,
    targetReached: true,
}
```

A target is not guaranteed to be reachable.

If the configured minimum quality is reached and the image is still too large:

```ts
result.compression.targetReached === false;
```

`minQuality` is intended to be used together with `targetSize`.

## Skip when optimization is not beneficial

In normal optimization modes, the package avoids replacing the original file with a larger result.

```ts
const result = await optimizeImage(file);

if (!result.optimized) {
    console.log(result.reason);
}
```

Possible result:

```text
output-larger-than-input
```

In that case the original `File` is retained for the upload pipeline.

## Result metadata

`optimizeImage()` returns detailed information about the operation.

```ts
const result = await optimizeImage(file);
```

The result contains:

```ts
{
    file,
    optimized,
    converted,
    changed,
    reason,

    original: {
        name,
        type,
        size,
        width,
        height,
    },

    output: {
        name,
        type,
        size,
        width,
        height,
    },

    compression: {
        quality,
        encodeAttempts,
        targetSize,
        targetReached,
    },

    savings: {
        bytes,
        ratio,
        percent,
    },

    sizeChange: {
        bytes,
        ratio,
        percent,
    },

    timing: {
        totalMs,
        decodeMs,
        resizeMs,
        encodeMs,
    },
}
```

### `optimized`

Indicates that an optimization produced a beneficial output.

### `converted`

Indicates that the output format differs from the input format.

### `changed`

Indicates that the returned file differs from the original file.

This distinction is useful because an intentional format conversion can be a valid change even when it is not smaller than the original.

## Mixed file batches

`processFiles()` is designed for real upload interfaces where images and non-images can appear together.

```ts
import { processFiles } from 'jamit-image-optimizer';

const result = await processFiles(files, {
    mode: 'auto',
    quality: 0.85,
    resize: {
        maxWidth: 1920,
        maxHeight: 1920,
    },
    concurrency: 2,
});
```

The API accepts a normal array of files or a browser `FileList`:

```ts
processFiles(
    files: readonly File[] | FileList,
    options?: ProcessFilesOptions,
): Promise<FileProcessingBatchResult>
```

A batch can contain files such as:

```text
photo.jpg
contract.pdf
screenshot.png
video.mp4
notes.txt
photo.webp
```

Supported images are processed.

Non-image files are passed through unchanged.

The order of the files is preserved.

```ts
const result = await processFiles(files);

console.log(result.files);
```

`result.files` can be used directly by the application's upload pipeline.

```ts
const formData = new FormData();

for (const file of result.files) {
    formData.append('files', file);
}
```

The input array and original `File` objects are not mutated.

## Batch result

`processFiles()` returns:

```ts
{
    files,
    items,
    summary,
}
```

### `files`

The final ordered `File[]`.

Use this when you only need upload-ready files.

### `items`

Detailed information for every input file.

```ts
for (const item of result.items) {
    console.log({
        index: item.index,
        kind: item.kind,
        outcome: item.outcome,
        reason: item.reason,
    });
}
```

Possible kinds:

```ts
'image'
'passthrough'
```

Possible outcomes:

```ts
'optimized'
'changed'
'unchanged'
'failed-passthrough'
```

`failed-passthrough` means an image was intended to be optimized, processing failed, and the original file was preserved according to the batch error policy.

### `summary`

The summary aggregates the whole batch.

```ts
console.log(result.summary);
```

It contains:

```ts
{
    totalFiles,
    imageFiles,
    optimizedFiles,
    changedFiles,
    unchangedFiles,
    failedOptimizations,
    originalBytes,
    outputBytes,
    savings,
    sizeChange,
}
```

## Batch concurrency

Image processing can be memory-intensive, so batch processing uses controlled concurrency.

```ts
const result = await processFiles(files, {
    concurrency: 2,
});
```

The default concurrency is:

```text
1
```

Only image-processing jobs need expensive worker / codec work. Passthrough files do not need to occupy an image-processing slot.

Concurrency must be a positive integer.

## Batch error policy

`processFiles()` supports two error modes:

```ts
type FileProcessingErrorMode =
    | 'passthrough'
    | 'throw';
```

### `passthrough`

This is the practical default for upload pipelines.

```ts
const result = await processFiles(files, {
    errorMode: 'passthrough',
});
```

When a recoverable image optimization fails, the original file can remain in `result.files`, while the corresponding item contains diagnostic information.

### `throw`

Use this when any processing failure should reject the complete batch.

```ts
await processFiles(files, {
    errorMode: 'throw',
});
```

An explicit `AbortSignal` abort rejects the active operation rather than returning a seemingly successful partial result.

## Abort processing

Both single-image and batch processing support `AbortSignal`.

```ts
const controller = new AbortController();

const promise = optimizeImage(file, {
    signal: controller.signal,
});

controller.abort();

await promise;
```

For a batch:

```ts
const controller = new AbortController();

const promise = processFiles(files, {
    concurrency: 2,
    signal: controller.signal,
});

controller.abort();

await promise;
```

An aborted operation rejects with an `ImageOptimizerError` whose code is:

```text
aborted
```

Active workers are terminated when the operation is aborted.

## Processing status

`optimizeImage()` can report processing lifecycle stages.

```ts
await optimizeImage(file, {
    onStatus(status) {
        console.log(status.stage);
    },
});
```

Stages are:

```ts
'queued'
'decoding'
'resizing'
'encoding'
'finalizing'
'completed'
```

`progress` is currently nullable because not every codec operation exposes meaningful percentage progress.

## Resource limits

Image decoding can require significantly more memory than the compressed input file.

The optimizer therefore applies deterministic resource limits.

The current defaults are:

```text
Maximum input size: 50 MiB
Maximum decoded pixels: 25,000,000
Maximum width or height: 16,384 px
```

They can be overridden:

```ts
const result = await optimizeImage(file, {
    limits: {
        maxInputBytes: 20 * 1024 * 1024,
        maxPixels: 12_000_000,
        maxDimension: 8192,
    },
});
```

These limits protect the browser-side processing pipeline from unexpectedly large inputs.

They are not security validation for your backend.

## HEIC / HEIF

HEIC / HEIF support is intentionally based on native browser / operating-system decoding capabilities.

The package does not bundle its own HEVC decoder.

The native decode strategy is feature-based rather than browser-name based.

If the environment cannot decode the selected HEIC / HEIF file, optimization cannot proceed through that codec path.

For upload pipelines, `processFiles()` can preserve such files unchanged depending on the applicable batch policy.

If HEIC / HEIF input is used, choose an encodable output mode such as:

```ts
const result = await optimizeImage(file, {
    mode: 'auto',
});
```

or:

```ts
const result = await optimizeImage(file, {
    mode: 'format',
    format: 'webp',
});
```

Native HEIC / HEIF support depends on the browser, operating system and available codecs.

## Transparency

Transparency is preserved where the selected output format supports it.

A transparent image must not silently lose its alpha channel.

For example, converting a transparent PNG to JPEG can be rejected rather than silently flattening transparency.

When using mixed batches with passthrough behavior, the original file can remain unchanged instead.

## Animation

The optimizer avoids silently destroying animation semantics.

Animated image variants that cannot be safely handled by the current processing path are not intentionally reduced to a single frame without an explicit supported strategy.

## File detection

The optimizer does not rely only on the filename extension.

Supported image content can be detected using file signatures where applicable.

This helps with browser files that have an empty or incorrect MIME type.

File detection is about deciding whether the optimizer can process the file. It is not a security guarantee.

## Errors

The package exposes a typed `ImageOptimizerError`.

```ts
import {
    isImageOptimizerError,
    optimizeImage,
} from 'jamit-image-optimizer';

try {
    await optimizeImage(file);
} catch (error) {
    if (isImageOptimizerError(error)) {
        console.error(error.code);
        console.error(error.message);
    }
}
```

Current error codes include:

```ts
type ImageOptimizerErrorCode =
    | 'unsupported-format'
    | 'codec-not-supported'
    | 'transparency-not-supported'
    | 'resource-limit-exceeded'
    | 'invalid-options'
    | 'browser-not-supported'
    | 'worker-failed'
    | 'aborted';
```

Do not rely only on error message strings. Prefer the typed `code`.

## Browser environment and SSR

Image processing itself is browser-only because it depends on browser APIs such as `File`, Web Workers and image decoding.

The package is designed so that importing it in an SSR-capable application does not immediately execute browser processing.

Call the processing APIs only in a browser context.

Example in a framework application:

```ts
if (typeof window !== 'undefined') {
    const result = await optimizeImage(file);
}
```

## Privacy

`jamit-image-optimizer` does not upload files.

It does not send images, filenames, metadata, performance information or usage information to an external service.

Processing happens locally until your application decides what to do with the returned `File`.

Your own application, analytics, upload code or surrounding infrastructure may of course have separate behavior outside this package.

## Security boundary

Client-side image optimization is not a security boundary.

The package does not guarantee that:

- a file is safe
- a MIME type is trustworthy
- passthrough files are validated
- optimized files can be stored without backend validation
- re-encoding removes every potentially unwanted property

Your backend and application remain responsible for:

- allowed file types
- file-size validation
- authorization
- content validation
- malware / security policies
- storage rules

## Existing upload integrations

The package is intentionally upload-independent.

You keep ownership of the upload flow.

```ts
const { files } = await processFiles(inputFiles, {
    mode: 'auto',
});

await uploadFiles(files);
```

This makes the optimizer suitable as a processing layer in front of:

- `fetch`
- `FormData`
- Axios
- S3 signed URLs
- multipart uploads
- custom upload APIs
- Vue / Nuxt applications
- React applications
- Vanilla TypeScript applications

No framework adapter is required for the core API.

## Example: file input

```html
<input id="files" type="file" multiple />
```

```ts
import { processFiles } from 'jamit-image-optimizer';

const input =
    document.querySelector<HTMLInputElement>(
        '#files',
    );

input?.addEventListener(
    'change',
    async () => {
        if (!input.files) {
            return;
        }

        const result =
            await processFiles(
                input.files,
                {
                    mode: 'auto',
                    quality: 0.85,
                    resize: {
                        maxWidth: 1920,
                        maxHeight: 1920,
                    },
                    concurrency: 2,
                },
            );

        console.log(result.files);
        console.log(result.summary);
    },
);
```

## Example: target-size upload pipeline

```ts
import { processFiles } from 'jamit-image-optimizer';

const result = await processFiles(files, {
    mode: 'auto',
    quality: 0.9,
    targetSize: 500 * 1024,
    minQuality: 0.5,
    resize: {
        maxWidth: 1920,
        maxHeight: 1920,
    },
    concurrency: 2,
});

for (const item of result.items) {
    console.log(
        item.originalFile.name,
        item.outcome,
        item.file.size,
    );
}

await uploadFiles(result.files);
```

## Playground and demo

An interactive browser demo is planned for:

```text
https://jamit.one/packages/jamit-image-optimizer
```

The playground demonstrates:

- drag and drop
- mixed file batches
- output modes
- quality
- target size
- resize
- concurrency
- processing status
- per-file results
- batch savings
- output previews
- downloads
- error handling
- full technical result data

## Development

Install dependencies:

```bash
pnpm install
```

Run the playground:

```bash
pnpm dev
```

Run type checking:

```bash
pnpm typecheck
```

Run unit tests:

```bash
pnpm test
```

Run browser tests:

```bash
pnpm test:browser
```

Run all tests:

```bash
pnpm test:all
```

Build the package:

```bash
pnpm build
```

Build the playground:

```bash
pnpm build:playground
```

Run the release validation:

```bash
pnpm release:check
```

## Design goals

The package deliberately focuses on image processing before upload.

It does not:

- upload files
- mutate `FormData`
- optimize PDFs
- transcode videos
- modify text files
- perform malware scanning
- replace backend validation
- enforce application-specific upload rules

Non-image files are simply useful participants in mixed batches because real upload interfaces rarely contain images only.

## License

MIT

## Author

JamIT

## Links

- GitHub: https://github.com/codeplayer71/jamit-image-optimizer
- Demo: https://jamit.one/packages/jamit-image-optimizer
