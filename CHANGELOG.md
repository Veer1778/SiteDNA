# Changelog

All notable changes to this project are documented here, in [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
format. This project doesn't ship versioned releases yet (see [ROADMAP via Claude.md](./Claude.md)),
so entries are grouped by phase rather than version number.

## [Phase 4] — Brand Engine

### Added

- `packages/brand-engine`: `mergeBrandJson({ crawlArtifact, extraction, vision? })` — the
  deterministic, no-I/O merge pipeline combining crawler/extractor/vision output into a
  schema-validated `BrandJson`, the first package depending on all three producers.
- `BrandKitResult = { brandJson, completeness, refinedAssets, logoSuggestion }`: `completeness`
  is a fixed-checklist gap report (`src/completeness.ts`) including every `ColorRoles` role,
  logo slots, non-empty scales, and an always-flagged `components` (no phase implements
  detection yet); `refinedAssets` (`src/refine-assets.ts`) applies the spec's example
  conflict-resolution rule — vision overrides an extractor asset classification above a
  confidence threshold (default 0.7); `logoSuggestion` passes through vision's logo suggestion
  without applying it.
- Serialization + a migration stub (`src/serialize.ts`): `serializeBrandJson`/
  `deserializeBrandJson`, and `migrateBrandJson` with an (currently empty) `MIGRATIONS` map —
  there's only ever been one Brand JSON schema version so far.
- Golden-file test against a self-contained recorded fixture set
  (`examples/fixtures/basic-site/`) and a `fast-check` property test asserting the merged output
  always validates against `BrandJsonSchema`.
- `@brandkit/extractor` now also exports `defaultFetchBytes` (needed by brand-engine's fixture
  recording script; previously only its type was public).

## [Phase 3] — Vision AI

### Added

- `packages/vision`: `VisionProvider` interface with `AnthropicVisionProvider` as the concrete
  implementation (model/API key configurable via env, no hardcoded keys) and
  `FakeVisionProvider` for tests.
- Classifies design language (multi-label, reusing `@brandkit/shared`'s
  `StyleClassificationSchema`), voice, photography/illustration style, spacing density, and
  animation style; produces (but does not apply) refinement suggestions for Phase 2's asset
  classifications and logo ranking.
- Structured-JSON-only prompts (`src/prompt.ts`), validated against
  `VisionClassificationSchema` with one retry-on-invalid before throwing
  `VisionResponseValidationError`.
- Cost guard (`src/prepare-images.ts`): caps images per request (default 3) and downscales each
  to a max dimension before sending.
- `classifyFromCrawlArtifact(artifact, provider, options)` adapter feeding a `CrawlArtifact`'s
  screenshots into the provider-agnostic interface.
- Every test injects a fake Anthropic client or uses `FakeVisionProvider` — zero live API calls.
- Structured classification-run logging via `onLog`, matching crawler/extractor.

## [Phase 2] — Extractors

### Added

- `packages/extractor`: `extractAll(artifact, options)` — turns a `CrawlArtifact` into
  colors, typography, logo, spacing/radius/shadow/animation scales, and classified assets.
- `src/colors.ts`: background/text from computed styles; primary/secondary/accent from the
  screenshot's node-vibrant palette, deduped via culori's Euclidean color distance.
- `src/typography.ts`: heading/body type scales from computed styles, with a documented
  system-font fallback.
- `src/logo.ts`: Cheerio-parsed `<img>`/`og:image`/favicon candidates, ranked heuristically;
  light/dark slot approximated from candidate luminance via Sharp.
- `src/tokens.ts`: spacing/radius/shadow/animation extraction from computed styles plus
  PostCSS-parsed stylesheet declarations.
- `src/assets.ts`: icon/illustration/photo classification via cheap signals first, then Sharp
  color-complexity sampling for a capped set of raster assets.
- Reused `packages/crawler`'s SSRF guard (now a public export) for extractor's own guarded
  fetches instead of duplicating it.
- Structured extraction-run logging via `onLog`, on every extractor function.
- Real recorded-fixture tests (`examples/fixtures/crawl-artifacts/basic-site/`) plus
  synthetic-artifact unit tests per module; end-to-end test validates every output against its
  `@brandkit/shared` schema.

## [Phase 1] — Crawler

### Fixed

- Pinned `dependency-cruiser` to 17.4.3 (from 18.x, which requires Node ≥22) after the Phase 1
  merge to `main` failed CI — CI runs Node 20 per `.nvmrc`; the bump had only been tested
  locally on a newer Node version.

### Added

- `packages/crawler`: `crawlUrl(url, options)` — Playwright/Chromium crawler for a single page,
  returning a normalized `CrawlArtifact` (rendered HTML, stylesheets, computed styles for key
  elements, full-page + viewport screenshots, asset/favicon candidates).
- SSRF hardening (`src/security/url-guard.ts`): every request — main navigation, each redirect
  hop, and subresources — is DNS-resolved and checked against loopback/link-local/RFC1918/
  unique-local ranges before being allowed.
- Redirect cap, navigation/total timeouts, and a best-effort response-size cap.
- robots.txt support (`src/security/robots.ts`), respected by default.
- Structured crawl-run logging via `CrawlOptions.onLog`.
- Disk serialization (`writeCrawlArtifactToDir` / `readCrawlArtifactFromDir`) and a manual-crawl
  CLI (`pnpm --filter @brandkit/crawler crawl <url>`) for fixture generation and verification.
- Local static-site fixture + integration test (`src/crawl.test.ts`) — no live sites in CI.
- CI: installs the Playwright Chromium binary before running tests.

## [Phase 0] — Scaffold and shared foundation

### Added

- Turborepo + pnpm monorepo scaffold: `apps/web` and nine `packages/*`, each buildable and
  testable, with strict TypeScript project references, ESLint flat config, Prettier,
  dependency-cruiser layering rules, and a Vitest workspace.
- `packages/shared`: the Brand JSON Zod schema (`BrandJsonSchema`) — logo, color roles,
  typography, spacing/radius scales, shadows, animations, detected components, voice, and style
  classification — with round-trip tests against one valid and five invalid fixtures.
- GitHub Actions CI running build/test/lint/dependency-check/format-check.
- Root README, `ARCHITECTURE.md`, `CONTRIBUTING.md`, `docs/BRAND_JSON.md`, and a README per
  package.
- MIT `LICENSE`.
