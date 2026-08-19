import {
    expect,
    test,
} from '@playwright/test';

test('optimizes an image through the real browser worker pipeline', async ({
                                                                               page,
                                                                           }) => {
    await page.goto(
        '/browser-test.html',
    );

    const result =
        await page.evaluate(async () => {
            return window
                .runImageOptimizationTest();
        });

    expect(result).toEqual({
        originalType: 'image/jpeg',
        outputType: 'image/webp',
        originalWidth: 64,
        originalHeight: 48,
        outputWidth: 32,
        outputHeight: 24,
        changed: true,
        converted: true,
    });
});

test('processes a mixed file batch through real browser workers', async ({
                                                                             page,
                                                                         }) => {
    await page.goto(
        '/browser-test.html',
    );

    const result =
        await page.evaluate(async () => {
            return window
                .runBatchOptimizationTest();
        });

    expect(result.names).toEqual([
        'first.webp',
        'notes.txt',
        'second.webp',
    ]);

    expect(result.types).toEqual([
        'image/webp',
        'text/plain',
        'image/webp',
    ]);

    expect(result.outcomes[0]).toMatch(
        /^(optimized|changed)$/,
    );

    expect(result.outcomes[1]).toBe(
        'unchanged',
    );

    expect(result.outcomes[2]).toMatch(
        /^(optimized|changed)$/,
    );

    expect(result).toMatchObject({
        totalFiles: 3,
        imageFiles: 2,
        unchangedFiles: 1,
        failedOptimizations: 0,
        processedImages: 2,
    });
});

test('limits real browser worker concurrency', async ({
                                                          page,
                                                      }) => {
    await page.goto(
        '/browser-test.html',
    );

    const result =
        await page.evaluate(async () => {
            return window
                .runConcurrencyTest();
        });

    expect(result).toEqual({
        maxActiveWorkers: 2,
        createdWorkers: 3,
        processedImages: 3,
    });
});

test('aborts and terminates an active browser worker', async ({
                                                                  page,
                                                              }) => {
    await page.goto(
        '/browser-test.html',
    );

    const result =
        await page.evaluate(async () => {
            return window
                .runAbortTest();
        });

    expect(result).toEqual({
        code: 'aborted',
        createdWorkers: 1,
        terminatedWorkers: 1,
    });
});

test('detects real JPEG content with missing or incorrect MIME types', async ({
                                                                                  page,
                                                                              }) => {
    await page.goto(
        '/browser-test.html',
    );

    const result =
        await page.evaluate(async () => {
            return window
                .runSignatureDetectionTest();
        });

    expect(result.names).toEqual([
        'empty-mime.webp',
        'incorrect-mime.webp',
    ]);

    expect(result.types).toEqual([
        'image/webp',
        'image/webp',
    ]);

    expect(result.outcomes[0]).toMatch(
        /^(optimized|changed)$/,
    );

    expect(result.outcomes[1]).toMatch(
        /^(optimized|changed)$/,
    );

    expect(result).toMatchObject({
        imageFiles: 2,
        failedOptimizations: 0,
    });
});

test('enforces image resource limits in the real browser worker', async ({
                                                                             page,
                                                                         }) => {
    await page.goto(
        '/browser-test.html',
    );

    const result =
        await page.evaluate(async () => {
            return window
                .runResourceLimitTest();
        });

    expect(result).toEqual({
        dimensionErrorCode:
            'resource-limit-exceeded',
        pixelErrorCode:
            'resource-limit-exceeded',
    });
});

test('searches WebP quality to reach a target size in the real browser', async ({
                                                                                    page,
                                                                                }) => {
    await page.goto(
        '/browser-test.html',
    );

    const result =
        await page.evaluate(async () => {
            return window
                .runTargetSizeTest();
        });

    expect(
        result.highQualitySize,
    ).toBeGreaterThan(
        result.lowQualitySize,
    );

    expect(result.targetSize).not.toBeNull();

    expect(
        result.targetSize!,
    ).toBeGreaterThan(
        result.lowQualitySize,
    );

    expect(
        result.targetSize!,
    ).toBeLessThan(
        result.highQualitySize,
    );

    expect(result.targetReached).toBe(
        true,
    );

    expect(
        result.outputSize,
    ).toBeLessThanOrEqual(
        result.targetSize!,
    );

    expect(
        result.encodeAttempts,
    ).toBeGreaterThan(1);

    expect(result.quality).not.toBeNull();

    expect(result.quality!).toBeLessThan(
        0.9,
    );
});