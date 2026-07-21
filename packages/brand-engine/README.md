# @brandkit/brand-engine

Merges `packages/crawler` + `packages/extractor` + `packages/vision` output into one final,
valid `BrandJson` document, with conflict resolution (e.g. vision overrides heuristic
classification above a confidence threshold), completeness scoring, and a gap report.
Implemented in Phase 4 (see [Claude.md](../../Claude.md)).

## Current state (Phase 0)

Stub — depends on `@brandkit/shared` and re-exports `SCHEMA_VERSION` as `TARGET_SCHEMA_VERSION`
to confirm the workspace dependency and TypeScript project reference resolve correctly. The
actual merge pipeline lands in Phase 4.

## Build/test in isolation

```sh
pnpm --filter @brandkit/brand-engine build
pnpm --filter @brandkit/brand-engine test
```
