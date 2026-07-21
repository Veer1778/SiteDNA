import type { BrandJson } from "@brandkit/shared";

/**
 * Package identity, used by tooling (CI, dependency-cruiser) to confirm the package builds and
 * is importable. Format exporters (PNG/SVG/PDF/PSD/tokens) land in Phase 8 — see Claude.md.
 */
export const PACKAGE_NAME = "@brandkit/exporters" as const;

/** Re-exported for consumers that only need the Brand JSON type via this package. */
export type { BrandJson };
