import { SCHEMA_VERSION } from "@brandkit/shared";

export type { MergeInputs, MergeOptions } from "./merge.js";
export { mergeBrandJson } from "./merge.js";

export * from "./schema.js";

export { computeCompleteness, LOW_CONFIDENCE_THRESHOLD } from "./completeness.js";

export { DEFAULT_ASSET_REFINEMENT_CONFIDENCE_THRESHOLD, refineAssets } from "./refine-assets.js";
export type { RefineAssetsOptions } from "./refine-assets.js";

export {
  deserializeBrandJson,
  migrateBrandJson,
  MIGRATIONS,
  serializeBrandJson,
  UnsupportedSchemaVersionError,
} from "./serialize.js";

export type { MergeLogEvent, MergeLogger } from "./log.js";

/**
 * Package identity, used by tooling (CI, dependency-cruiser) to confirm the package builds and
 * is importable.
 */
export const PACKAGE_NAME = "@brandkit/brand-engine" as const;

/** The Brand JSON schema version this build of the merge pipeline targets. */
export const TARGET_SCHEMA_VERSION = SCHEMA_VERSION;
