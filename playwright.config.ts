import { defineConfig } from '@playwright/test';

const baseURL = 'http://127.0.0.1:4173';

export default defineConfig({
    testDir: './tests/browser',

    fullyParallel: false,

    forbidOnly: false,

    retries: 0,

    workers: 1,

    use: {
        baseURL,
        browserName: 'chromium',
        trace: 'on-first-retry',
    },

    webServer: {
        command:
            'pnpm exec vite playground --host 127.0.0.1 --port 4173 --strictPort',
        url: baseURL,
        reuseExistingServer: true,
        timeout: 120_000,
    },
});