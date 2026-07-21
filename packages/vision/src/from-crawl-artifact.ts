import type { CrawlArtifact } from "@brandkit/crawler";

import { type VisionLogger, noopLogger } from "./log.js";
import type { AssetCandidate, LogoCandidate, VisionProvider } from "./provider.js";
import type { VisionClassification } from "./schema.js";

export interface ClassifyFromCrawlArtifactOptions {
  /** Phase 2's current asset classifications, for vision to refine. */
  assetCandidates?: AssetCandidate[];
  /** Phase 2's ranked logo candidates, for vision to refine. */
  logoCandidates?: LogoCandidate[];
  onLog?: VisionLogger;
}

/**
 * Convenience adapter: feeds a `CrawlArtifact`'s full-page and viewport screenshots to
 * `provider` as a `VisionInput`. Kept separate from `VisionProvider` itself so the core
 * interface stays screenshot-shape-agnostic and testable without a `CrawlArtifact` at all.
 */
export async function classifyFromCrawlArtifact(
  artifact: CrawlArtifact,
  provider: VisionProvider,
  options: ClassifyFromCrawlArtifactOptions = {},
): Promise<VisionClassification> {
  const log = options.onLog ?? noopLogger;

  log({
    level: "info",
    step: "from-crawl-artifact",
    message: `classifying ${artifact.finalUrl}`,
  });

  const input: Parameters<VisionProvider["classify"]>[0] = {
    images: [
      { label: "full-page screenshot", buffer: artifact.screenshotFullPage, mimeType: "image/png" },
      { label: "viewport screenshot", buffer: artifact.screenshotViewport, mimeType: "image/png" },
    ],
  };
  if (options.assetCandidates !== undefined) input.assetCandidates = options.assetCandidates;
  if (options.logoCandidates !== undefined) input.logoCandidates = options.logoCandidates;

  const result = await provider.classify(input);

  log({ level: "info", step: "from-crawl-artifact", message: "done" });
  return result;
}
