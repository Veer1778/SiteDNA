/**
 * Package identity, used by tooling (CI, dependency-cruiser) to confirm the package builds and
 * is importable. The `VisionProvider` interface and Anthropic-backed implementation land in
 * Phase 3 — see Claude.md.
 */
export const PACKAGE_NAME = "@brandkit/vision" as const;
