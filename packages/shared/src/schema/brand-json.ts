import { z } from "zod";

import { AnimationsSchema } from "./animations.js";
import { ColorRolesSchema } from "./colors.js";
import { ComponentsSchema } from "./components.js";
import { LogoSchema } from "./logo.js";
import { RadiusScaleSchema } from "./radius.js";
import { ShadowsSchema } from "./shadows.js";
import { SpacingScaleSchema } from "./spacing.js";
import { StyleClassificationSchema } from "./style-classification.js";
import { TypographySchema } from "./typography.js";
import { VoiceSchema } from "./voice.js";

/**
 * The schema versions this build of `@brandkit/shared` can produce/validate. Bump when the
 * Brand JSON shape changes in a breaking way, and add a migration in `packages/brand-engine`
 * (Phase 4) rather than silently reinterpreting old documents.
 */
export const SCHEMA_VERSION = "1.0.0";
export const SchemaVersionSchema = z.literal(SCHEMA_VERSION);

/**
 * Brand JSON: the single source of truth for an extracted brand identity. Every BrandKit AI
 * package reads or writes this shape — never a parallel/ad-hoc schema. Produced by
 * `packages/brand-engine` (Phase 4) by merging crawler, extractor, and vision output.
 */
export const BrandJsonSchema = z.object({
  /** Schema version this document was produced under; see {@link SCHEMA_VERSION}. */
  schemaVersion: SchemaVersionSchema,
  /** The canonical URL this Brand Kit was extracted from. */
  sourceUrl: z.string().url(),
  /** ISO 8601 timestamp of when extraction completed. */
  extractedAt: z.string().datetime(),
  logo: LogoSchema,
  colors: ColorRolesSchema,
  typography: TypographySchema,
  spacing: SpacingScaleSchema,
  radius: RadiusScaleSchema,
  shadows: ShadowsSchema,
  animations: AnimationsSchema,
  components: ComponentsSchema,
  /** Brand voice/personality descriptors from Vision AI. */
  voice: VoiceSchema,
  styleClassification: StyleClassificationSchema,
});
export type BrandJson = z.infer<typeof BrandJsonSchema>;
