import { z } from "zod";

/**
 * A spacing scale: distinct pixel values clustered from observed margin/padding/gap usage,
 * sorted ascending. Empty for sites with no discernible consistent scale.
 */
export const SpacingScaleSchema = z.array(z.number().nonnegative());
export type SpacingScale = z.infer<typeof SpacingScaleSchema>;
