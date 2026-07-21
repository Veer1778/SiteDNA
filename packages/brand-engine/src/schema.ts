import { ClassifiedAssetSchema } from "@brandkit/extractor";
import { BrandJsonSchema } from "@brandkit/shared";
import { LogoRefinementSchema } from "@brandkit/vision";
import { z } from "zod";

/** How severe a completeness gap is. */
export const GapSeveritySchema = z.enum(["missing", "low-confidence"]);
export type GapSeverity = z.infer<typeof GapSeveritySchema>;

/** One entry in the completeness report: a field the merge pipeline couldn't fully populate. */
export const GapSchema = z.object({
  /** Dot-path into the Brand JSON, e.g. `"colors.primary"`, `"logo.dark"`, `"components"`. */
  field: z.string(),
  severity: GapSeveritySchema,
  message: z.string(),
});
export type Gap = z.infer<typeof GapSchema>;

/**
 * A simple, documented completeness heuristic: `score` is the fraction of a fixed checklist of
 * fields that are present/confident (see `src/completeness.ts`), `gaps` lists what's missing or
 * low-confidence and why.
 */
export const CompletenessReportSchema = z.object({
  score: z.number().min(0).max(1),
  gaps: z.array(GapSchema),
});
export type CompletenessReport = z.infer<typeof CompletenessReportSchema>;

/**
 * `packages/brand-engine`'s actual output. `brandJson` is the spec-mandated deliverable — a
 * complete, valid `BrandJson` (`@brandkit/shared`). The rest is this package's own: the
 * completeness/gap report, the asset classifications after vision's refinements were applied
 * (not a `BrandJson` field — see `ARCHITECTURE.md`), and vision's logo suggestion passed through
 * unmodified (informational only; `brandJson.logo` always keeps extraction's original — see
 * `packages/brand-engine/README.md` for why).
 */
export const BrandKitResultSchema = z.object({
  brandJson: BrandJsonSchema,
  completeness: CompletenessReportSchema,
  refinedAssets: z.array(ClassifiedAssetSchema),
  logoSuggestion: LogoRefinementSchema,
});
export type BrandKitResult = z.infer<typeof BrandKitResultSchema>;
