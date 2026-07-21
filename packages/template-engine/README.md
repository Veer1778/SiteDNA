# @brandkit/template-engine

Generates branded social/marketing templates (Instagram, LinkedIn, Pinterest, YouTube
thumbnails, etc.) from `BrandJson`, rendered to a Fabric.js-compatible scene graph consumed by
`packages/editor` and `packages/exporters`. Implemented in Phase 6 (see
[Claude.md](../../Claude.md)).

## Current state (Phase 0)

Stub — depends on `@brandkit/shared` and re-exports the `BrandJson` type to confirm the
workspace dependency resolves. Template definitions and the scene-graph renderer land in
Phase 6.

## Build/test in isolation

```sh
pnpm --filter @brandkit/template-engine build
pnpm --filter @brandkit/template-engine test
```
