/**
 * Package identity, used by tooling (CI, dependency-cruiser) to confirm the package builds and
 * is importable. Real crawling logic lands in Phase 1 — see Claude.md.
 */
export const PACKAGE_NAME = "@brandkit/crawler" as const;
