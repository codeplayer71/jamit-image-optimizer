import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

const mocks = vi.hoisted(() => ({
    decodeImage: vi.fn(),
    resize: vi.fn(),
    encodeImage: vi.fn(),
}));

vi.mock('../src/image-decoder', () => ({
    decodeImage: mocks.decodeImage,
}));

vi.mock('@jsquash/resize', () => ({
    default: mocks.resize,
}));

vi.mock('../src/image-encoder', () => ({
    encodeImage: mocks.encodeImage,
}));

type WorkerScopeMock = {
    onmessage:
        | ((
        event: MessageEvent,
    ) => Promise<void>)
        | null;
    postMessage: ReturnType<typeof vi.fn>;
};

describe('image worker resource limits', () => {
    beforeEach(() => {
        vi.resetModules();

        mocks.decodeImage.mockReset();
        mocks.resize.mockReset();
        mocks.encodeImage.mockReset();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('rejects an image above maxDimension before resize and encoding', async () => {
        const workerScope: WorkerScopeMock = {
            onmessage: null,
            postMessage: vi.fn(),
        };

        vi.stubGlobal(
            'self',
            workerScope,
        );

        mocks.decodeImage.mockResolvedValue({
            width: 20_000,
            height: 1_000,
            data: new Uint8ClampedArray(0),
        });

        await import(
            '../src/image-worker'
            );

        expect(
            workerScope.onmessage,
        ).not.toBeNull();

        await workerScope.onmessage?.({
            data: {
                buffer:
                    new ArrayBuffer(4),
                inputFormat: 'jpeg',
                outputFormat: 'webp',
                quality: 80,
                maxDimension: 16_384,
                maxPixels: 25_000_000,
                maxWidth: 1_920,
                maxHeight: 1_920,
            },
        } as MessageEvent);

        expect(
            mocks.decodeImage,
        ).toHaveBeenCalledOnce();

        expect(
            mocks.resize,
        ).not.toHaveBeenCalled();

        expect(
            mocks.encodeImage,
        ).not.toHaveBeenCalled();

        expect(
            workerScope.postMessage,
        ).toHaveBeenLastCalledWith(
            expect.objectContaining({
                type: 'error',
                code:
                    'resource-limit-exceeded',
            }),
        );
    });
});