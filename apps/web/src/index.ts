import { SCHEMA_VERSION } from "@brandkit/shared";

/**
 * Package identity, used by tooling (CI, dependency-cruiser) to confirm the app builds and is
 * importable. Hono API routes and the Next.js UI land in Phase 5 — see Claude.md.
 */
export const PACKAGE_NAME = "@brandkit/web" as const;

/** The Brand JSON schema version this build of the API is compatible with. */
export const API_SCHEMA_VERSION = SCHEMA_VERSION;
