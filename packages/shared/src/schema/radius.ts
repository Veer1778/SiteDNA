import { z } from "zod";

/**
 * A border-radius scale: distinct pixel values clustered from observed `border-radius` usage,
 * sorted ascending.
 */
export const RadiusScaleSchema = z.array(z.number().nonnegative());
export type RadiusScale = z.infer<typeof RadiusScaleSchema>;
