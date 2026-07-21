import sharp from "sharp";

import type { VisionImage } from "./provider.js";
import { type VisionLogger, noopLogger } from "./log.js";

/** Default cap on how many images go into one classification request. */
export const DEFAULT_MAX_IMAGES = 3;
/** Default longest-side cap (pixels) images are downscaled to before sending. */
export const DEFAULT_MAX_DIMENSION = 1024;
/** Downscaled images are re-encoded as JPEG at this quality (1-100). */
const JPEG_QUALITY = 80;

export interface PrepareImagesOptions {
  maxImages?: number;
  maxDimension?: number;
  onLog?: VisionLogger;
}

/**
 * The cost guard: caps the number of images sent to a vision provider and downscales each to
 * `maxDimension`'s longest side, re-encoded as JPEG. Images already at or under the limit are
 * still re-encoded (uniform format is simpler for providers), but only ever shrunk, never
 * enlarged. Images beyond `maxImages` are dropped, not sent.
 */
export async function prepareImages(
  images: VisionImage[],
  options: PrepareImagesOptions = {},
): Promise<VisionImage[]> {
  const maxImages = options.maxImages ?? DEFAULT_MAX_IMAGES;
  const maxDimension = options.maxDimension ?? DEFAULT_MAX_DIMENSION;
  const log = options.onLog ?? noopLogger;

  const capped = images.slice(0, maxImages);
  if (images.length > capped.length) {
    log({
      level: "info",
      step: "prepare-images-cap",
      message: `dropped ${images.length - capped.length} image(s) beyond the ${maxImages}-image cap`,
    });
  }

  const prepared: VisionImage[] = [];
  for (const image of capped) {
    const buffer = await sharp(image.buffer)
      .resize({
        width: maxDimension,
        height: maxDimension,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: JPEG_QUALITY })
      .toBuffer();

    prepared.push({ label: image.label, buffer, mimeType: "image/jpeg" });
    log({
      level: "info",
      step: "prepare-images-downscale",
      message: `prepared "${image.label}": ${image.buffer.byteLength}B -> ${buffer.byteLength}B`,
    });
  }

  return prepared;
}
