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