# @brandkit/crawler

Playwright-based crawler that fetches a single URL and returns a normalized, SSRF-hardened
`CrawlArtifact`: rendered HTML, stylesheets (linked + inline), computed styles for key elements,
full-page and viewport screenshots, and asset/favicon candidates. Consumed by
`packages/extractor` in Phase 2 — see [Claude.md](../../Claude.md) and
[ARCHITECTURE.md](../../ARCHITECTURE.md).

## Usage

```ts
import { crawlUrl, writeCrawlArtifactToDir } from "@brandkit/crawler";

const artifact = await crawlUrl("https://example.com", {
  onLog: (event) => console.log(event),
});

await writeCrawlArtifactToDir(artifact, "./out/example-com");
```

`pnpm --filter @brandkit/crawler crawl <url> [outDir]` runs the same thing from the CLI —
useful for manual verification and for generating fixtures for Phase 2.

## Security hardening

- **SSRF**: every request (main navigation, redirects, subresources) is resolved via DNS and
  checked against loopback/link-local/RFC1918/unique-local ranges before being allowed —
  `src/security/url-guard.ts`. `CrawlOptions.allowPrivateNetwork` is a test-only escape hatch
  used by this package's own integration test; never set it for real crawls.
- **Redirects**: capped at `maxRedirects` (default 5); each hop is independently SSRF-checked.
- **Timeouts**: `navigationTimeoutMs` (default 15s) bounds page load; `totalTimeoutMs` (default
  30s) bounds the whole crawl.
- **Response size**: best-effort cap via `Content-Length` (default 25MB) — a response that omits
  that header is not currently bounded before download; closing that gap needs streaming reads
  and is deferred past Phase 1.
- **robots.txt**: respected by default (`respectRobotsTxt: true`); disable per-call if needed.

## Schema

`CrawlArtifactSchema` (Zod) lives in `src/schema.ts`, fully JSDoc'd. It intentionally is **not**
part of `packages/shared` — it's an intermediate shape, not Brand JSON.

## Reusable SSRF guard

`normalizeUrl`, `resolveAndValidateHost`, `isPrivateOrReservedIp`, and the `DnsLookup` type
(`src/security/url-guard.ts`) are public exports so other packages that need to fetch arbitrary
URLs discovered in crawled content (e.g. `packages/extractor` fetching logo/asset image bytes)
can reuse this package's SSRF guard instead of re-implementing it.

## Fixtures

`examples/fixtures/sites/basic/` is a small static site (served by a local `http` server, never
a live URL) used by the integration test in `src/crawl.test.ts`.

## Build/test in isolation

```sh
pnpm --filter @brandkit/crawler build
pnpm --filter @brandkit/crawler test
```

Requires Chromium's Playwright binary once: `pnpm --filter @brandkit/crawler exec playwright
install chromium`.
