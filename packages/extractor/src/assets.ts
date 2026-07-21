import type { AssetRef, CrawlArtifact } from "@brandkit/crawler";
import sharp from "sharp";

import { type ExtractLogger, noopLogger } from "./log.js";
import { defaultFetchBytes, type FetchBytes } from "./security.js";
import type { AssetClassification, ClassifiedAsset } from "./schema.js";

/** Images at or below this size (in either dimension) read as icons, not illustrations/photos. */
const ICON_MAX_DIMENSION = 64;
/** Above this per-channel stddev (0-255 scale), an image reads as a photo rather than a flat illustration. */
const PHOTO_STDDEV_THRESHOLD = 30;
/** Bounds how many raster assets get fetched+sampled for color complexity, to cap crawl cost. */
const MAX_SAMPLED_ASSETS = 20;

function isSvg(asset: AssetRef): boolean {
  return asset.contentType === "image/svg+xml" || asset.url.toLowerCase().endsWith(".svg");
}

function isIconSized(asset: AssetRef): boolean {
  return (
    asset.width !== null &&
    asset.height !== null &&
    Math.max(asset.width, asset.height) <= ICON_MAX_DIMENSION
  );
}

async function classifyByColorComplexity(bytes: Buffer): Promise<AssetClassification | null> {
  try {
    const stats = await sharp(bytes).stats();
    const stddevs = stats.channels.map((c) => c.stdev);
    const avgStdev = stddevs.reduce((sum, v) => sum + v, 0) / stddevs.length;
    return avgStdev >= PHOTO_STDDEV_THRESHOLD ? "photo" : "illustration";
  } catch {
    return null;
  }
}

/**
 * Classifies each image/icon asset from `artifact.assets` as `icon`/`illustration`/`photo`.
 * Cheap signals first (crawler-flagged icon, small dimensions, SVG-without-icon-size); only
 * raster assets that need a color-complexity call are fetched (guarded, capped at
 * {@link MAX_SAMPLED_ASSETS}) — assets beyond the cap are classified `other` rather than
 * guessed. Non-image assets (fonts, etc.) are not included in the output.
 */
export async function classifyAssets(
  artifact: CrawlArtifact,
  options: { onLog?: ExtractLogger; fetchBytes?: FetchBytes } = {},
): Promise<ClassifiedAsset[]> {
  const log = options.onLog ?? noopLogger;
  const fetchBytes = options.fetchBytes ?? defaultFetchBytes;

  const imageAssets = artifact.assets.filter((a) => a.kind === "image" || a.kind === "icon");
  const results: ClassifiedAsset[] = [];
  let sampled = 0;

  for (const asset of imageAssets) {
    if (asset.kind === "icon") {
      results.push({ url: asset.url, classification: "icon", reason: "crawler-flagged-icon" });
      continue;
    }
    if (isIconSized(asset)) {
      results.push({ url: asset.url, classification: "icon", reason: "small-dimensions" });
      continue;
    }
    if (isSvg(asset)) {
      results.push({ url: asset.url, classification: "illustration", reason: "svg-default" });
      continue;
    }

    if (sampled >= MAX_SAMPLED_ASSETS) {
      results.push({ url: asset.url, classification: "other", reason: "sample-cap-reached" });
      continue;
    }
    sampled += 1;

    const bytes = await fetchBytes(asset.url);
    const classification = bytes ? await classifyByColorComplexity(bytes) : null;
    if (classification) {
      results.push({ url: asset.url, classification, reason: "color-complexity" });
    } else {
      results.push({ url: asset.url, classification: "other", reason: "fetch-or-decode-failed" });
      log({ level: "warn", step: "assets", message: `could not sample ${asset.url}` });
    }
  }

  log({
    level: "info",
    step: "assets",
    message: `classified ${results.length} asset(s), sampled ${sampled} for color complexity`,
  });

  return results;
}
