import { z } from "zod";

/** Image formats the pipeline recognizes for logo assets. */
export const ImageFormatSchema = z.enum(["png", "jpg", "webp", "svg", "ico", "gif", "avif"]);
export type ImageFormat = z.infer<typeof ImageFormatSchema>;

/** One candidate logo asset with enough metadata to render or re-fetch it. */
export const LogoAssetSchema = z.object({
  /** Absolute URL or storage reference for the asset. */
  url: z.string().min(1),
  /** Intrinsic width in pixels. */
  width: z.number().positive(),
  /** Intrinsic height in pixels. */
  height: z.number().positive(),
  format: ImageFormatSchema,
});
export type LogoAsset = z.infer<typeof LogoAssetSchema>;

/**
 * The best logo candidate found for each display context. All optional: a given site may only
 * expose, say, a favicon, or may have no distinguishable dark-mode variant.
 */
export const LogoSchema = z.object({
  /** Logo variant intended for light backgrounds. */
  light: LogoAssetSchema.optional(),
  /** Logo variant intended for dark backgrounds, detected via luminance analysis. */
  dark: LogoAssetSchema.optional(),
  /** Small square mark used as a favicon/app icon. */
  favicon: LogoAssetSchema.optional(),
});
export type Logo = z.infer<typeof LogoSchema>;
