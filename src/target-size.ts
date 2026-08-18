type TargetSizeCandidate<T> = {
    value: T;
    size: number;
};

type TargetSizeSearchOptions<T> = {
    targetSize: number;
    initialQuality: number;
    minQuality: number;
    maxAttempts: number;
    encode: (quality: number) => Promise<TargetSizeCandidate<T>>;
};

export type TargetSizeSearchResult<T> = {
    value: T;
    size: number;
    quality: number;
    attempts: number;
    targetReached: boolean;
};

export async function searchTargetSize<T>(
    options: TargetSizeSearchOptions<T>,
): Promise<TargetSizeSearchResult<T>> {
    let attempts = 0;

    const encode = async (quality: number) => {
        attempts += 1;

        return options.encode(quality);
    };

    const initialCandidate = await encode(options.initialQuality);

    if (initialCandidate.size <= options.targetSize) {
        return {
            ...initialCandidate,
            quality: options.initialQuality,
            attempts,
            targetReached: true,
        };
    }

    if (
        options.minQuality === options.initialQuality ||
        attempts >= options.maxAttempts
    ) {
        return {
            ...initialCandidate,
            quality: options.initialQuality,
            attempts,
            targetReached: false,
        };
    }

    const minimumCandidate = await encode(options.minQuality);

    if (minimumCandidate.size > options.targetSize) {
        return {
            ...minimumCandidate,
            quality: options.minQuality,
            attempts,
            targetReached: false,
        };
    }

    let bestCandidate = minimumCandidate;
    let bestQuality = options.minQuality;
    let lowerQuality = options.minQuality;
    let upperQuality = options.initialQuality;

    while (attempts < options.maxAttempts) {
        const quality = (lowerQuality + upperQuality) / 2;
        const candidate = await encode(quality);

        if (candidate.size <= options.targetSize) {
            bestCandidate = candidate;
            bestQuality = quality;
            lowerQuality = quality;
        } else {
            upperQuality = quality;
        }
    }

    return {
        ...bestCandidate,
        quality: bestQuality,
        attempts,
        targetReached: true,
    };
}