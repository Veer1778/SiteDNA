# @brandkit/editor

Canva-like React + Fabric.js editor for templates produced by `packages/template-engine`: move,
resize, rotate, text editing, image replace, layers, grouping, alignment, snap guides, zoom,
and undo/redo via a command-pattern history. Implemented in Phase 7 (see
[Claude.md](../../Claude.md), split into 7a/7b as the largest phase).

## Current state (Phase 0)

Stub only — exports `PACKAGE_NAME` so the package is genuinely buildable and testable ahead of
Phase 7. Will depend on `packages/template-engine`'s scene-graph shape once that exists.

## Build/test in isolation

```sh
pnpm --filter @brandkit/editor build
pnpm --filter @brandkit/editor test
```
