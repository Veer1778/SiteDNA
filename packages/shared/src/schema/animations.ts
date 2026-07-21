import { z } from "zod";

/**
 * A summary of CSS transition/animation usage across the crawled page(s), used to characterize
 * a site's motion style rather than reproduce every keyframe.
 */
export const AnimationsSchema = z.object({
  /** Distinct transition/animation durations observed, in milliseconds. */
  durations: z.array(z.number().nonnegative()),
  /** Distinct easing functions observed, e.g. `["ease-in-out", "cubic-bezier(0.4,0,0.2,1)"]`. */
  easings: z.array(z.string().min(1)),
});
export type Animations = z.infer<typeof AnimationsSchema>;
