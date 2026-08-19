# Changelog

All notable changes to `jamit-image-optimizer` will be documented in this file.

The format is based on Keep a Changelog, and this project follows Semantic Versioning.

## [Unreleased]

## [0.1.0] - 2026-08-19

### Added

- Framework-independent TypeScript API for browser image optimization
- `optimizeImage()` for processing individual image files
- `processFiles()` for mixed upload batches
- Browser `File` to browser `File` processing
- Web Worker based image processing
- WebAssembly powered JPEG, PNG and WebP codecs
- JPEG decoding and encoding
- PNG decoding and encoding
- WebP decoding and encoding
- Native HEIC / HEIF decoding where supported by the browser or operating system
- Image format detection using file signatures
- MIME type fallback for supported image formats
- Resize support using maximum width and height
- Aspect-ratio preserving resize behavior
- Protection against unintended image upscaling
- Configurable JPEG and WebP quality
- Target file size optimization
- Configurable minimum quality for target-size searches
- Bounded quality search with limited encode attempts
- `original` output mode
- `format` output mode
- `auto` output mode with WebP optimization candidate
- Explicit JPEG, PNG and WebP output format selection
- Skip-if-not-beneficial behavior for normal optimization flows
- Protection against unsafe transparency loss
- Protection against silently destroying animated image semantics
- Detailed original and output image metadata
- Compression metadata including selected quality and encode attempts
- Byte, ratio and percentage savings metrics
- Size-change metrics
- Decode, resize, encode and total timing information
- Controlled batch concurrency
- Stable input and output file ordering
- Non-image passthrough support for mixed batches
- Batch summaries
- Per-file processing outcomes
- Configurable batch error behavior
- `AbortSignal` support
- Active worker termination after abort
- Processing lifecycle status callbacks
- Per-file batch status callbacks
- Input file size limits
- Decoded pixel-count limits
- Maximum image dimension limits
- Typed `ImageOptimizerError`
- `isImageOptimizerError()` helper
- Typed error codes for supported failure conditions
- SSR-safe package imports
- Public TypeScript declarations
- ESM package build
- Zero required runtime dependencies for consumers
- Automated Vitest unit tests
- Real Chromium browser integration tests with Playwright
- CI validation for type checking, unit tests and browser tests
- Interactive development playground
- Drag and drop file selection
- Playground optimization settings
- Per-file result cards
- Batch result summary
- Output image previews
- Download controls for processed images
- Copyable technical result output
- Visible validation and processing error messages
- Playground reset functionality
- Public package documentation
- MIT license