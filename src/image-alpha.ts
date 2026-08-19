export function hasTransparency(
    imageData: ImageData,
): boolean {
    const { data } = imageData;

    for (let index = 3; index < data.length; index += 4) {
        if (data[index] !== 255) {
            return true;
        }
    }

    return false;
}