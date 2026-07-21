# @brandkit/crawler

Playwright-based crawler that fetches a URL and returns a normalized, SSRF-hardened crawl
artifact: rendered HTML, stylesheets, computed styles for key elements, screenshots, and
asset/favicon candidates. Implemented in Phase 1 (see [Claude.md](../../Claude.md)).

## Current state (Phase 0)

Stub only — exports `PACKAGE_NAME` so the package is genuinely buildable and testable ahead of
Phase 1's crawl logic. No dependency on `packages/shared` yet; the crawl artifact it will
produce is a separate shape from Brand JSON, consumed by `packages/extractor`.

## Build/test in isolation

```sh
pnpm --filter @brandkit/crawler build
pnpm --filter @brandkit/crawler test
```
