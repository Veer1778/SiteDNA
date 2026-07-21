import {
  AnimationsSchema,
  ColorRolesSchema,
  LogoSchema,
  RadiusScaleSchema,
  ShadowsSchema,
  SpacingScaleSchema,
  TypographySchema,
} from "@brandkit/shared";
import { z } from "zod";

/**
 * Finer-grained classification of an image asset than the crawler's `AssetKind` — not part of
 * Brand JSON (there is no top-level "assets" field there); this feeds `brand-engine`'s
 * completeness scoring in Phase 4 and gets refined by Vision AI in Phase 3.
 */
export const AssetClassificationSchema = z.enum(["icon", "illustration", "photo", "other"]);
export type AssetClassification = z.infer<typeof AssetClassificationSchema>;

/** One asset from the crawl artifact, classified by this package. */
export const ClassifiedAssetSchema = z.object({
  url: z.string().url(),
  classification: AssetClassificationSchema,
  /** How the classification was reached — for debugging/tuning the heuristics, not a schema guarantee. */
  reason: z.string(),
});
export type ClassifiedAsset = z.infer<typeof ClassifiedAssetSchema>;

/**
 * Everything this package derives from one `CrawlArtifact`: the pieces of Brand JSON it can
 * produce heuristically (colors, typography, logo, and the token scales), plus its own
 * classified-assets list. `packages/brand-engine` (Phase 4) merges this with vision output into
 * a complete, valid `BrandJson`.
 */
export const ExtractionResultSchema = z.object({
  colors: ColorRolesSchema,
  typography: TypographySchema,
  logo: LogoSchema,
  spacing: SpacingScaleSchema,
  radius: RadiusScaleSchema,
  shadows: ShadowsSchema,
  animations: AnimationsSchema,
  assets: z.array(ClassifiedAssetSchema),
});
export type ExtractionResult = z.infer<typeof ExtractionResultSchema>;
