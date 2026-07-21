import { z } from "zod";

import { ConfidenceSchema } from "./colors.js";

/** The design-language labels Vision AI can assign, multi-label with independent scores. */
export const DesignLanguageLabelSchema = z.enum([
  "modern",
  "corporate",
  "luxury",
  "editorial",
  "minimal",
  "neobrutalism",
  "glassmorphism",
  "material",
  "apple-like",
  "stripe-like",
]);
export type DesignLanguageLabel = z.infer<typeof DesignLanguageLabelSchema>;

/** One scored label in a multi-label classification. */
export const ScoredLabelSchema = z.object({
  label: DesignLanguageLabelSchema,
  /** Model confidence that this label applies (0-1); multiple labels may score highly at once. */
  score: ConfidenceSchema,
});
export type ScoredLabel = z.infer<typeof ScoredLabelSchema>;

/** Multi-label design-language classification, most confident labels first by convention. */
export const StyleClassificationSchema = z.array(ScoredLabelSchema);
export type StyleClassification = z.infer<typeof StyleClassificationSchema>;
