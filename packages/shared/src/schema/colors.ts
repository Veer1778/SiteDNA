import { z } from "zod";

/** Lowercase 6-digit hex color, e.g. `#1a2b3c`. Colors are normalized to this form on extraction. */
export const HexColorSchema = z
  .string()
  .regex(/^#[0-9a-f]{6}$/, "must be a lowercase 6-digit hex color, e.g. #1a2b3c");

/** How confident the extraction pipeline is in a derived value, from 0 (guess) to 1 (certain). */
export const ConfidenceSchema = z.number().min(0).max(1);

/** A single extracted color with the extractor's confidence in the assignment. */
export const ColorValueSchema = z.object({
  /** Normalized hex value, e.g. `#1a2b3c`. */
  hex: HexColorSchema,
  /** Confidence that this color correctly fills the role it was assigned to (0-1). */
  confidence: ConfidenceSchema,
});
export type ColorValue = z.infer<typeof ColorValueSchema>;

/**
 * The semantic color roles a Brand Kit defines. Each role is optional because a given site
 * may not exhibit every role (e.g. a monochrome site may have no `accent`).
 */
export const ColorRolesSchema = z.object({
  /** Dominant brand color, typically from primary buttons/links. */
  primary: ColorValueSchema.optional(),
  /** Secondary supporting brand color. */
  secondary: ColorValueSchema.optional(),
  /** Highlight/CTA color distinct from primary. */
  accent: ColorValueSchema.optional(),
  /** Color used for cards, panels, and other raised surfaces. */
  surface: ColorValueSchema.optional(),
  /** Page background color. */
  background: ColorValueSchema.optional(),
  /** Primary body text color. */
  text: ColorValueSchema.optional(),
  /** Default border/divider color. */
  border: ColorValueSchema.optional(),
  /** Color used to communicate success states. */
  success: ColorValueSchema.optional(),
  /** Color used to communicate warning states. */
  warning: ColorValueSchema.optional(),
  /** Color used to communicate danger/error states. */
  danger: ColorValueSchema.optional(),
});
export type ColorRoles = z.infer<typeof ColorRolesSchema>;
