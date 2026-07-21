import type { CrawlArtifact } from "@brandkit/crawler";
import type { ExtractionResult } from "@brandkit/extractor";
import { type BrandJson, BrandJsonSchema, SCHEMA_VERSION } from "@brandkit/shared";
import type { VisionClassification } from "@brandkit/vision";

import { computeCompleteness } from "./completeness.js";
import { type MergeLogger, noopLogger } from "./log.js";
import { refineAssets } from "./refine-assets.js";
import { type BrandKitResult, BrandKitResultSchema } from "./schema.js";

export interface MergeInputs {
  crawlArtifact: CrawlArtifact;
  extraction: ExtractionResult;
  /** Optional — Vision AI is a paid, non-guaranteed step. `voice`/`styleClassification` are `[]` without it. */
  vision?: VisionClassification;
}

export interface MergeOptions {
  assetRefinementConfidenceThreshold?: number;
  onLog?: MergeLogger;
}

/**
 * The deterministic merge pipeline: combines a `CrawlArtifact`, an `ExtractionResult`, and an
 * optional `VisionClassification` into one valid `BrandJson`, plus this package's own
 * completeness report and refined-assets/logo-suggestion side channel (see `schema.ts` for why
 * those aren't part of `BrandJson`). No I/O — every input is already-computed data.
 */
export function mergeBrandJson(inputs: MergeInputs, options: MergeOptions = {}): BrandKitResult {
  const log = options.onLog ?? noopLogger;

  const brandJson: BrandJson = {
    schemaVersion: SCHEMA_VERSION,
    sourceUrl: inputs.crawlArtifact.sourceUrl,
    extractedAt: inputs.crawlArtifact.crawledAt,
    logo: inputs.extraction.logo,
    colors: inputs.extraction.colors,
    typography: inputs.extraction.typography,
    spacing: inputs.extraction.spacing,
    radius: inputs.extraction.radius,
    shadows: inputs.extraction.shadows,
    animations: inputs.extraction.animations,
    // No phase (0-3) implements UI component detection yet — see completeness.ts and
    // ARCHITECTURE.md. Not a bug: the completeness report flags it honestly.
    components: [],
    voice: inputs.vision?.voice ?? [],
    styleClassification: inputs.vision?.styleClassification ?? [],
  };

  log({
    level: "info",
    step: "merge",
    message: `merging Brand JSON for ${brandJson.sourceUrl}`,
    meta: { hasVision: inputs.vision !== undefined },
  });

  const refineOptions: Parameters<typeof refineAssets>[2] = { onLog: log };
  if (options.assetRefinementConfidenceThreshold !== undefined) {
    refineOptions.confidenceThreshold = options.assetRefinementConfidenceThreshold;
  }
  const refinedAssets = refineAssets(
    inputs.extraction.assets,
    inputs.vision?.assetRefinements,
    refineOptions,
  );

  const logoSuggestion = inputs.vision?.logoRefinement ?? null;

  // Validate before computing completeness, so a malformed merge fails loudly here rather than
  // producing a misleading completeness score against data that was never actually valid.
  const validatedBrandJson = BrandJsonSchema.parse(brandJson);
  const completeness = computeCompleteness(validatedBrandJson);

  log({
    level: "info",
    step: "completeness",
    message: `completeness score ${completeness.score}`,
    meta: { gaps: completeness.gaps.length },
  });

  return BrandKitResultSchema.parse({
    brandJson: validatedBrandJson,
    completeness,
    refinedAssets,
    logoSuggestion,
  });
}
