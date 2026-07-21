import type { CrawlArtifact } from "@brandkit/crawler";

import { extractColors } from "./colors.js";
import { classifyAssets } from "./assets.js";
import { defaultFetchBytes, type FetchBytes } from "./security.js";
import { extractLogo } from "./logo.js";
import { type ExtractLogger, noopLogger } from "./log.js";
import type { ExtractionResult } from "./schema.js";
import { extractTokens } from "./tokens.js";
import { extractTypography } from "./typography.js";

export { extractColors, type GetPalette, type Palette, type PaletteSwatch } from "./colors.js";
export { extractTypography } from "./typography.js";
export { extractLogo } from "./logo.js";
export { extractTokens, type Tokens } from "./tokens.js";
export { classifyAssets } from "./assets.js";
export * from "./schema.js";
export type { ExtractLogEvent, ExtractLogger } from "./log.js";
export type { FetchBytes, FetchBytesOptions } from "./security.js";

/**
 * Runs every extractor module against `artifact` and composes the result. This is
 * `packages/extractor`'s main entry point — the pieces of Brand JSON it can derive
 * heuristically, plus its own classified-assets list. `packages/brand-engine` (Phase 4) merges
 * this with Vision AI output into a complete, valid `BrandJson`.
 */
export async function extractAll(
  artifact: CrawlArtifact,
  options: { onLog?: ExtractLogger; fetchBytes?: FetchBytes } = {},
): Promise<ExtractionResult> {
  const log = options.onLog ?? noopLogger;
  const fetchBytes = options.fetchBytes ?? defaultFetchBytes;

  log({ level: "info", step: "extract-all", message: `extracting from ${artifact.finalUrl}` });

  const [colors, logo, assets] = await Promise.all([
    extractColors(artifact, { onLog: log }),
    extractLogo(artifact, { onLog: log, fetchBytes }),
    classifyAssets(artifact, { onLog: log, fetchBytes }),
  ]);
  const typography = extractTypography(artifact, { onLog: log });
  const tokens = extractTokens(artifact, { onLog: log });

  log({ level: "info", step: "extract-all", message: "done" });

  return {
    colors,
    typography,
    logo,
    spacing: tokens.spacing,
    radius: tokens.radius,
    shadows: tokens.shadows,
    animations: tokens.animations,
    assets,
  };
}

/** Package identity, used by tooling to confirm the package builds and is importable. */
export const PACKAGE_NAME = "@brandkit/extractor" as const;
