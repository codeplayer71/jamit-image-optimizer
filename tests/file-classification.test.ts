import { describe, expect, it } from 'vitest';

import { classifyFile } from '../src/file-classification';
import { createTestImageFile } from './test-image-files';

describe('classifyFile', () => {
    it.each([
        'jpeg',
        'png',
        'webp',
    ] as const)(
        'classifies %s content as a supported image',
        async (format) => {
            const file = createTestImageFile(
                format,
            );

            await expect(
                classifyFile(file),
            ).resolves.toBe(
                'supported-image',
            );
        },
    );

    it.each([
        'image/heic',
        'image/heif',
    ])(
        'classifies %s as a supported image',
        async (type) => {
            const file = new File(
                [new Uint8Array(4)],
                'photo',
                {
                    type,
                },
            );

            await expect(
                classifyFile(file),
            ).resolves.toBe(
                'supported-image',
            );
        },
    );

    it.each([
        'image/gif',
        'image/svg+xml',
    ])(
        'classifies %s as an unsupported image',
        async (type) => {
            const file = new File(
                [new Uint8Array(4)],
                'image',
                {
                    type,
                },
            );

            await expect(
                classifyFile(file),
            ).resolves.toBe(
                'unsupported-image',
            );
        },
    );

    it.each([
        'application/pdf',
        'video/mp4',
        'text/plain',
    ])(
        'classifies %s as passthrough',
        async (type) => {
            const file = new File(
                [new Uint8Array(4)],
                'file',
                {
                    type,
                },
            );

            await expect(
                classifyFile(file),
            ).resolves.toBe(
                'passthrough',
            );
        },
    );

    it('treats an empty MIME type without a known image signature as passthrough', async () => {
        const file = new File(
            [new Uint8Array(4)],
            'unknown',
        );

        await expect(
            classifyFile(file),
        ).resolves.toBe(
            'passthrough',
        );
    });

    it('detects an image from its signature when the MIME type is empty', async () => {
        const file = createTestImageFile(
            'jpeg',
            {
                name: 'photo',
                type: '',
            },
        );

        await expect(
            classifyFile(file),
        ).resolves.toBe(
            'supported-image',
        );
    });

    it('detects an image from its signature when the MIME type is incorrect', async () => {
        const file = createTestImageFile(
            'webp',
            {
                name: 'photo.bin',
                type:
                    'application/octet-stream',
            },
        );

        await expect(
            classifyFile(file),
        ).resolves.toBe(
            'supported-image',
        );
    });

    it('does not trust a JPEG MIME type when the content is not recognized', async () => {
        const file = new File(
            [
                new Uint8Array([
                    0x01,
                    0x02,
                    0x03,
                    0x04,
                ]),
            ],
            'photo.jpg',
            {
                type: 'image/jpeg',
            },
        );

        await expect(
            classifyFile(file),
        ).resolves.toBe(
            'unsupported-image',
        );
    });

    it('detects HEIC from its file signature when the MIME type is empty', async () => {
        const bytes = new Uint8Array(24);
        const view = new DataView(bytes.buffer);

        view.setUint32(0, 24);

        bytes.set(
            [
                0x66,
                0x74,
                0x79,
                0x70,
            ],
            4,
        );

        bytes.set(
            [
                0x6d,
                0x69,
                0x66,
                0x31,
            ],
            8,
        );

        bytes.set(
            [
                0x68,
                0x65,
                0x69,
                0x63,
            ],
            16,
        );

        const file = new File(
            [bytes],
            'photo',
        );

        await expect(
            classifyFile(file),
        ).resolves.toBe(
            'supported-image',
        );
    });
});