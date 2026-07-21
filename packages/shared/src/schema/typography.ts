import { z } from "zod";

/**
 * The set of typographic values actually observed in use for one role (heading or body),
 * as opposed to every value a stylesheet merely declares.
 */
export const TypeScaleSchema = z.object({
  /** Font stack in cascade order, e.g. `["Inter", "system-ui", "sans-serif"]`. */
  families: z.array(z.string().min(1)).min(1),
  /** Distinct numeric font-weights observed in use, e.g. `[400, 600, 700]`. */
  weights: z.array(z.number().int().min(1).max(1000)).min(1),
  /** Distinct font sizes observed in use, in pixels. */
  sizes: z.array(z.number().positive()).min(1),
  /** Distinct letter-spacing values observed in use, in pixels (can be negative). */
  letterSpacing: z.array(z.number()),
  /** Distinct unitless line-height multipliers observed in use. */
  lineHeights: z.array(z.number().positive()),
});
export type TypeScale = z.infer<typeof TypeScaleSchema>;

/** Typography extracted separately for headings (h1-h6) and body copy. */
export const TypographySchema = z.object({
  heading: TypeScaleSchema,
  body: TypeScaleSchema,
});
export type Typography = z.infer<typeof TypographySchema>;
