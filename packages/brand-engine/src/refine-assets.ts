import type { ClassifiedAsset } from "@brandkit/extractor";
import type { AssetRefinement } from "@brandkit/vision";

import { type MergeLogger, noopLogger } from "./log.js";

/** Below this confidence, vision's suggested asset classification is ignored — extractor's heuristic wins. */
export const DEFAULT_ASSET_REFINEMENT_CONFIDENCE_THRESHOLD = 0.7;

export interface RefineAssetsOptions {
  confidenceThreshold?: number;
  onLog?: MergeLogger;
}

/**
 * The spec's example conflict-resolution rule: vision overrides an extractor asset
 * classification only when it disagrees AND its confidence is at or above
 * `confidenceThreshold` (default {@link DEFAULT_ASSET_REFINEMENT_CONFIDENCE_THRESHOLD}).
 * Pure function — no I/O, deterministic given the same inputs.
 */
export function refineAssets(
  extractedAssets: ClassifiedAsset[],
  assetRefinements: AssetRefinement[] = [],
  options: RefineAssetsOptions = {},
): ClassifiedAsset[] {
  const threshold = options.confidenceThreshold ?? DEFAULT_ASSET_REFINEMENT_CONFIDENCE_THRESHOLD;
  const log = options.onLog ?? noopLogger;
  const refinementsByUrl = new Map(assetRefinements.map((r) => [r.url, r]));

  return extractedAssets.map((asset) => {
    const refinement = refinementsByUrl.get(asset.url);
    if (!refinement) return asset;

    if (refinement.confidence < threshold) {
      log({
        level: "info",
        step: "asset-refinement-skipped",
        message: `${asset.url}: vision suggested "${refinement.suggestedClassification}" at confidence ${refinement.confidence}, below threshold ${threshold}`,
      });
      return asset;
    }

    if (refinement.suggestedClassification === asset.classification) return asset;

    log({
      level: "info",
      step: "asset-refinement-applied",
      message: `${asset.url}: "${asset.classification}" -> "${refinement.suggestedClassification}" (vision confidence ${refinement.confidence})`,
    });
    return {
      ...asset,
      classification: refinement.suggestedClassification,
      reason: `vision override (was "${asset.classification}"): ${refinement.reason}`,
    };
  });
}
