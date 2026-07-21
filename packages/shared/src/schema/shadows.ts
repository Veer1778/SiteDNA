import { z } from "zod";

import { HexColorSchema } from "./colors.js";

/** One deduped `box-shadow` layer observed in use. */
export const ShadowSchema = z.object({
  /** Horizontal offset in pixels. */
  offsetX: z.number(),
  /** Vertical offset in pixels. */
  offsetY: z.number(),
  /** Blur radius in pixels; never negative per the CSS spec. */
  blur: z.number().nonnegative(),
  /** Spread radius in pixels; can be negative. */
  spread: z.number(),
  /** Shadow color, normalized to hex (alpha is not preserved in this scale). */
  color: HexColorSchema,
  /** Whether the shadow is drawn inside the element's border box. */
  inset: z.boolean(),
});
export type Shadow = z.infer<typeof ShadowSchema>;

/** Deduped list of distinct shadow definitions observed in use. */
export const ShadowsSchema = z.array(ShadowSchema);
export type Shadows = z.infer<typeof ShadowsSchema>;
