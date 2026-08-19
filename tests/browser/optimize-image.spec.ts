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