import sharp from "sharp";

// Returns true if the image is blurry (Laplacian variance below threshold)
export async function isImageBlurry(buffer: Buffer, threshold = 100): Promise<boolean> {
  const { data, info } = await sharp(buffer)
    .resize({ width: 512, withoutEnlargement: true })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height } = info;
  const pixels = new Uint8Array(data.buffer);

  let sum = 0;
  let sumSq = 0;
  let count = 0;

  // Laplacian kernel: [0,1,0,1,-4,1,0,1,0]
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const lap =
        -4 * pixels[idx] +
        pixels[idx - 1] +
        pixels[idx + 1] +
        pixels[idx - width] +
        pixels[idx + width];
      sum += lap;
      sumSq += lap * lap;
      count++;
    }
  }

  const mean = sum / count;
  const variance = sumSq / count - mean * mean;
  return variance < threshold;
}
