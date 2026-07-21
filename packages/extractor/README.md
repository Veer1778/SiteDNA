# @brandkit/extractor

Turns a crawl artifact (from `packages/crawler`) into raw design tokens: colors, typography,
logo candidates, spacing/radius/shadow scales, and asset classification. Implemented in
Phase 2 (see [Claude.md](../../Claude.md)).

## Current state (Phase 0)

Stub only — exports `PACKAGE_NAME` so the package is genuinely buildable and testable ahead of
Phase 2's extraction logic. Will take a `@brandkit/crawler` artifact as input and depend on
`@brandkit/shared` once it starts emitting partial `BrandJson` fields.

## Build/test in isolation

```sh
pnpm --filter @brandkit/extractor build
pnpm --filter @brandkit/extractor test
```
