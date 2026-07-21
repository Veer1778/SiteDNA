# @brandkit/extractor

Turns a `CrawlArtifact` (from `packages/crawler`) into raw design tokens: colors, typography,
logo, spacing/radius/shadow/animation scales, and classified assets. Consumed by
`packages/brand-engine` in Phase 4 — see [Claude.md](../../Claude.md) and
[ARCHITECTURE.md](../../ARCHITECTURE.md).

## Usage

```ts
import { crawlUrl } from "@brandkit/crawler";
import { extractAll } from "@brandkit/extractor";

const artifact = await crawlUrl("https://example.com");
const result = await extractAll(artifact, {
  onLog: (event) => console.log(event),
});
// result: { colors, typography, logo, spacing, radius, shadows, animations, assets }
```

Each module is also exported individually (`extractColors`, `extractTypography`, `extractLogo`,
`extractTokens`, `classifyAssets`) if you only need one piece.

## Modules

- **`src/colors.ts`** — `background`/`text` from computed `html`/`body` styles (high
  confidence); `primary`/`secondary`/`accent` from the full-page screenshot's palette
  (node-vibrant), deduped via culori's Euclidean color distance and cross-checked against
  button/link/nav computed colors. `success`/`warning`/`danger` are never set — no reliable
  signal for semantic roles at this phase.
- **`src/typography.ts`** — heading (`h1`-`h6`) and body (`body`/`p`) type scales from computed
  styles, with a documented system-font fallback if a group has zero usable samples.
- **`src/logo.ts`** — Cheerio-parses the rendered HTML for `<img>` near `header`/`nav`,
  logo-ish alt/class/src, and `og:image`; combines with the crawler's `faviconCandidates`.
  `light`/`dark` is approximated from the winning candidate's own average luminance (Phase 1
  only crawls once — there's no forced dark-mode re-crawl to detect true variants).
- **`src/tokens.ts`** — spacing/radius scales, deduped shadows, and an animation summary.
  Primary source is the crawler's computed styles; PostCSS-parsed stylesheet declarations
  supplement it (needed for transition/animation durations, which aren't in the computed-style
  sample set).
- **`src/assets.ts`** — classifies each image asset as `icon`/`illustration`/`photo`/`other`.
  Cheap signals first (crawler-flagged icon, small dimensions, bare SVG); raster assets that
  need it are fetched (guarded, capped) and classified by Sharp per-channel color-complexity
  stats.

## Network access

`logo.ts` and `assets.ts` fetch bytes the crawl didn't already download (candidate logo/favicon
images, a capped sample of raster assets) via `defaultFetchBytes` (`src/security.ts`, a public
export), which reuses `@brandkit/crawler`'s SSRF guard rather than duplicating it. Both modules
take an injectable `fetchBytes` so callers (and this package's own tests) can avoid real network
access entirely.

## Logging

Every extractor function takes an optional `onLog` callback (`ExtractLogEvent = { level, step,
message, meta? }`, `src/log.ts`), same shape as `packages/crawler`'s `CrawlLogEvent`. Defaults
to a no-op.

## Fixtures

`examples/fixtures/crawl-artifacts/basic-site/` is a real `CrawlArtifact` recorded once from
`packages/crawler`'s local fixture site (never a live site) — regenerate it with
`pnpm --filter @brandkit/extractor record-fixture`. Every module also has synthetic-artifact
unit tests for edge cases (`src/test-utils.ts`).

## Build/test in isolation

```sh
pnpm --filter @brandkit/extractor build
pnpm --filter @brandkit/extractor test
```
