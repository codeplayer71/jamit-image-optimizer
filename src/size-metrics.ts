export type SizeSavings = {
    bytes: number;
    ratio: number;
    percent: number;
};

export type SizeChange = {
    bytes: number;
    ratio: number;
    percent: number;
};

export type SizeMetrics = {
    savings: SizeSavings;
    sizeChange: SizeChange;
};

export function calculateSizeMetrics(
    originalBytes: number,
    outputBytes: number,
): SizeMetrics {
    if (originalBytes <= 0) {
        return {
            savings: {
                bytes: 0,
                ratio: 0,
                percent: 0,
            },
            sizeChange: {
                bytes: outputBytes,
                ratio: 0,
                percent: 0,
            },
        };
    }

    const difference = outputBytes - originalBytes;
    const changeRatio = difference / originalBytes;

    const savedBytes = Math.max(0, originalBytes - outputBytes);
    const savedRatio = savedBytes / originalBytes;

    return {
        savings: {
            bytes: savedBytes,
            ratio: savedRatio,
            percent: savedRatio * 100,
        },
        sizeChange: {
            bytes: difference,
            ratio: changeRatio,
            percent: changeRatio * 100,
        },
    };
}