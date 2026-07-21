import { SCHEMA_VERSION } from "@brandkit/shared";

/**
 * Package identity, used by tooling (CI, dependency-cruiser) to confirm the package builds and
 * is importable. The merge pipeline lands in Phase 4 — see Claude.md.
 */
export const PACKAGE_NAME = "@brandkit/brand-engine" as const;

/** The Brand JSON schema version this build of the merge pipeline targets. */
export const TARGET_SCHEMA_VERSION = SCHEMA_VERSION;
