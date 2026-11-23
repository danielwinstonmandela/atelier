/** Browser-side image helpers: decode, downscale and re-encode before anything is uploaded. */

export const MAX_ORIGINAL_DIM = 1600;
export const THUMB_DIM = 480;

export async function decodeImage(blob: Blob): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(blob, { imageOrientation: "from-image" });
  } catch {
    throw new Error("This image format can't be read by your browser. Try a JPEG, PNG or WebP photo.");
  }
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not encode the image."))), type, quality)
  );
}

/**
 * Scale an image down so its longest side is at most `maxDim` (never up) and encode it.
 * For JPEG output, transparent areas are flattened onto `background`.
 */
export async function renderImage(
  source: Blob,
  opts: { maxDim: number; type: "image/jpeg" | "image/png" | "image/webp"; quality?: number; background?: string }
): Promise<{ blob: Blob; width: number; height: number }> {
  const bitmap = await decodeImage(source);
  try {
    const scale = Math.min(1, opts.maxDim / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Your browser couldn't prepare the image.");
    ctx.imageSmoothingQuality = "high";
    if (opts.type === "image/jpeg") {
      ctx.fillStyle = opts.background ?? "#ffffff";
      ctx.fillRect(0, 0, width, height);
    }
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await toBlob(canvas, opts.type, opts.quality);
    return { blob, width, height };
  } finally {
    bitmap.close();
  }
}

export const prepareOriginal = (file: Blob) =>
  renderImage(file, { maxDim: MAX_ORIGINAL_DIM, type: "image/jpeg", quality: 0.88 });

export const prepareProcessed = (file: Blob) => renderImage(file, { maxDim: MAX_ORIGINAL_DIM, type: "image/png" });

export const prepareThumb = (file: Blob) =>
  renderImage(file, { maxDim: THUMB_DIM, type: "image/webp", quality: 0.82 });
