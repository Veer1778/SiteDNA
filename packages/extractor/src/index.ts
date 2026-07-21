/**
 * Package identity, used by tooling (CI, dependency-cruiser) to confirm the package builds and
 * is importable. Real extraction logic lands in Phase 2 — see Claude.md.
 */
export const PACKAGE_NAME = "@brandkit/extractor" as const;
