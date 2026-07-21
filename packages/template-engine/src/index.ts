import type { BrandJson } from "@brandkit/shared";

/**
 * Package identity, used by tooling (CI, dependency-cruiser) to confirm the package builds and
 * is importable. The template renderer lands in Phase 6 — see Claude.md.
 */
export const PACKAGE_NAME = "@brandkit/template-engine" as const;

/** Re-exported for consumers that only need the Brand JSON type via this package. */
export type { BrandJson };
