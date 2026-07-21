import { z } from "zod";

/** The kinds of reusable UI components the extractor knows how to detect. */
export const ComponentTypeSchema = z.enum([
  "button",
  "input",
  "card",
  "nav",
  "footer",
  "hero",
  "modal",
  "badge",
  "avatar",
  "table",
  "form",
  "other",
]);
export type ComponentType = z.infer<typeof ComponentTypeSchema>;

/** A pixel-space bounding box within the captured screenshot, origin at top-left. */
export const BoundingBoxSchema = z.object({
  x: z.number().nonnegative(),
  y: z.number().nonnegative(),
  width: z.number().positive(),
  height: z.number().positive(),
});
export type BoundingBox = z.infer<typeof BoundingBoxSchema>;

/** One detected UI component instance, cropped from a full-page screenshot. */
export const DetectedComponentSchema = z.object({
  type: ComponentTypeSchema,
  /** Reference (storage key or URL) to the cropped screenshot of this component. */
  screenshotRef: z.string().min(1),
  /** Location of the component within the source screenshot. */
  boundingBox: BoundingBoxSchema,
});
export type DetectedComponent = z.infer<typeof DetectedComponentSchema>;

/** All components detected across the crawled page(s). */
export const ComponentsSchema = z.array(DetectedComponentSchema);
export type Components = z.infer<typeof ComponentsSchema>;
