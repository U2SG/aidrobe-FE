const MAX_MATTE_DIMENSION = 320;

type MutableRgba = Uint8Array | Uint8ClampedArray;

export function scaledMatteSize(
  sourceWidth: number,
  sourceHeight: number,
  maxDimension = MAX_MATTE_DIMENSION,
) {
  const safeWidth = Math.max(1, Math.round(sourceWidth));
  const safeHeight = Math.max(1, Math.round(sourceHeight));
  const scale = Math.min(1, maxDimension / Math.max(safeWidth, safeHeight));
  return {
    width: Math.max(1, Math.round(safeWidth * scale)),
    height: Math.max(1, Math.round(safeHeight * scale)),
  };
}

function median(values: number[]) {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1]! + sorted[middle]!) / 2 : sorted[middle]!;
}

/**
 * Clears only near-white, low-chroma pixels connected to an opaque image edge.
 * Interior cream/white garment regions are never seeded, so they remain intact.
 */
export function removeBorderConnectedMatte(pixels: MutableRgba, width: number, height: number) {
  if (width <= 0 || height <= 0 || pixels.length < width * height * 4) return 0;

  const cornerIndices = [0, width - 1, (height - 1) * width, width * height - 1];
  const opaqueCorners = cornerIndices.filter((index) => pixels[index * 4 + 3]! >= 200);
  if (opaqueCorners.length === 0) return 0;

  const background = [0, 1, 2].map((channel) =>
    median(opaqueCorners.map((index) => pixels[index * 4 + channel]!)),
  );
  const seen = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0;
  let tail = 0;

  const isBackground = (index: number) => {
    const offset = index * 4;
    const red = pixels[offset]!;
    const green = pixels[offset + 1]!;
    const blue = pixels[offset + 2]!;
    const alpha = pixels[offset + 3]!;
    const distance = Math.hypot(
      red - background[0]!,
      green - background[1]!,
      blue - background[2]!,
    );
    const chroma = Math.max(red, green, blue) - Math.min(red, green, blue);
    return alpha >= 200 && distance < 28 && Math.min(red, green, blue) > 228 && chroma < 18;
  };
  const enqueue = (index: number) => {
    if (seen[index] || !isBackground(index)) return;
    seen[index] = 1;
    queue[tail] = index;
    tail += 1;
  };

  for (let x = 0; x < width; x += 1) {
    enqueue(x);
    enqueue((height - 1) * width + x);
  }
  for (let y = 0; y < height; y += 1) {
    enqueue(y * width);
    enqueue(y * width + width - 1);
  }
  while (head < tail) {
    const index = queue[head]!;
    head += 1;
    const x = index % width;
    const y = Math.floor(index / width);
    if (x > 0) enqueue(index - 1);
    if (x + 1 < width) enqueue(index + 1);
    if (y > 0) enqueue(index - width);
    if (y + 1 < height) enqueue(index + width);
  }

  for (let index = 0; index < seen.length; index += 1) {
    if (seen[index]) pixels[index * 4 + 3] = 0;
  }
  return tail;
}
