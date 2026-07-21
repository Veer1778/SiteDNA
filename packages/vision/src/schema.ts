import { ConfidenceSchema, StyleClassificationSchema, VoiceSchema } from "@brandkit/shared";
import { z } from "zod";

/**
 * Deliberately re-declared rather than imported from `packages/extractor` — a stable 4-value
 * enum, not worth a package dependency edge for. Keep in sync with
 * `packages/extractor/src/schema.ts`'s `AssetClassificationSchema` if either changes.
 */
export const VisionAssetClassificationSchema = z.enum(["icon", "illustration", "photo", "other"]);
export type VisionAssetClassification = z.infer<typeof VisionAssetClassificationSchema>;

/** How densely spaced a design reads, visually — not derivable from CSS numbers alone. */
export const SpacingDensitySchema = z.enum(["compact", "comfortable", "spacious"]);
export type SpacingDensity = z.infer<typeof SpacingDensitySchema>;

/** Freeform descriptors for a site's photography style, e.g. `["candid", "high-contrast"]`. */
export const PhotographyStyleSchema = z.array(z.string().min(1));
export type PhotographyStyle = z.infer<typeof PhotographyStyleSchema>;

/** Freeform descriptors for a site's illustration style, e.g. `["flat", "geometric"]`. */
export const IllustrationStyleSchema = z.array(z.string().min(1));
export type IllustrationStyle = z.infer<typeof IllustrationStyleSchema>;

/** Freeform descriptors for a site's motion/animation style, e.g. `["subtle", "playful"]`. */
export const AnimationStyleSchema = z.array(z.string().min(1));
export type AnimationStyle = z.infer<typeof AnimationStyleSchema>;

/**
 * A suggested correction/confirmation for one of Phase 2's classified assets. `brand-engine`
 * (Phase 4) decides whether to apply it (e.g. above a confidence threshold) — vision only
 * suggests.
 */
export const AssetRefinementSchema = z.object({
  url: z.string().url(),
  suggestedClassification: VisionAssetClassificationSchema,
  confidence: ConfidenceSchema,
  /** Short human-readable justification, for debugging/tuning — not a schema guarantee. */
  reason: z.string(),
});
export type AssetRefinement = z.infer<typeof AssetRefinementSchema>;

/** A suggested replacement for Phase 2's top-ranked logo candidate, or `null` if vision agrees. */
export const LogoRefinementSchema = z
  .object({
    suggestedLogoUrl: z.string().url(),
    reason: z.string(),
  })
  .nullable();
export type LogoRefinement = z.infer<typeof LogoRefinementSchema>;

/**
 * Everything `packages/vision` derives from a site's screenshots. `styleClassification` and
 * `voice` map directly onto Brand JSON fields (`packages/shared`); the rest has no Brand JSON
 * field of its own and is consumed by `brand-engine`'s merge/refinement pipeline (Phase 4).
 */
export const VisionClassificationSchema = z.object({
  styleClassification: StyleClassificationSchema,
  voice: VoiceSchema,
  photographyStyle: PhotographyStyleSchema,
  illustrationStyle: IllustrationStyleSchema,
  spacingDensity: SpacingDensitySchema,
  animationStyle: AnimationStyleSchema,
  assetRefinements: z.array(AssetRefinementSchema),
  logoRefinement: LogoRefinementSchema,
});
export type VisionClassification = z.infer<typeof VisionClassificationSchema>;
