import { defineConfig } from 'vite';

export default defineConfig({
    base: './',

    build: {
        lib: {
            entry: 'src/index.ts',
            formats: [
                'es',
            ],
            fileName: 'index',
        },
        target: 'es2022',
        minify: false,
    },
});