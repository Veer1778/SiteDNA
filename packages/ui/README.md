# @brandkit/ui

Shared shadcn/ui-based component library used across `apps/web` and `packages/editor`. Grown
incrementally as those consumers need components, rather than pre-built speculatively.

## Current state (Phase 0)

Stub only — exports `PACKAGE_NAME` so the package is genuinely buildable and testable. No
components yet; no dependency on `@brandkit/shared` (this package is pure UI, not brand-data
aware).

## Build/test in isolation

```sh
pnpm --filter @brandkit/ui build
pnpm --filter @brandkit/ui test
```
