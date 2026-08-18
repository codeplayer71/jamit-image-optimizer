export async function mapWithConcurrency<TInput, TOutput>(
    items: readonly TInput[],
    concurrency: number,
    mapper: (item: TInput, index: number) => Promise<TOutput>,
): Promise<TOutput[]> {
    const results = new Array<TOutput>(items.length);
    let nextIndex = 0;

    async function runWorker(): Promise<void> {
        while (nextIndex < items.length) {
            const index = nextIndex;
            nextIndex += 1;

            const item = items[index];

            if (item === undefined) {
                continue;
            }

            results[index] = await mapper(item, index);
        }
    }

    const workerCount = Math.min(concurrency, items.length);

    await Promise.all(
        Array.from(
            { length: workerCount },
            () => runWorker(),
        ),
    );

    return results;
}