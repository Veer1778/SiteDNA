# Changelog

All notable changes to this project are documented here, in [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
format. This project doesn't ship versioned releases yet (see [ROADMAP via Claude.md](./Claude.md)),
so entries are grouped by phase rather than version number.

## [Post-5b] — Dashboard redesign, Apple-style theme, bare-domain input

### Added

- Split the tokens card into dedicated Spacing/Radius/Shadows/Animations cards with real values
  (px labels, actual `box-shadow` CSS, duration/easing chips) instead of unlabeled abstract
  bars/swatches; added a stat-tile summary row (completeness, colors found, logo variants, token
  count) and a header showing the analyzed URL. Long token lists (spacing, shadows, durations)
  cap at 8 with a "Show N more" toggle — one real site had 47 distinct shadows.
- `TypeScaleCard` now renders an actual live preview in the detected typeface (best-effort
  Google Fonts load, title-casing the family name first — Google's API is case-sensitive and
  extraction preserves whatever case the site's own CSS used).
- Landing page redesigned as a two-column hero (URL input + a "What you'll get" feature panel);
  a "Back to home" control added to every analyze-page state, not just the completed dashboard.
- The URL input now accepts a bare domain (`spotify.com`) — normalized to `https://spotify.com/`
  client-side before validation, since `type="url"`'s native browser validation requires a
  scheme and would otherwise block submission before any of our own JS runs.

### Style direction (supersedes the Phase 5b "Light Mode Skeumorphism" entry below)

- The UI was redirected from the warm-paper skeuomorphic theme to a flat black-and-white,
  Apple-product-page look: white/near-white surfaces, near-black text, soft minimal shadows
  (no more inset "pressed into paper" treatment), pill-shaped buttons, and a system-font-first
  type stack (`-apple-system` → San Francisco on Apple devices, Inter elsewhere) replacing the
  Fraunces serif display face. Implemented by changing the _values_ behind the same CSS custom
  property names (`--color-paper`, `--shadow-raised`, etc.) rather than renaming them, so no
  component needed a per-file edit for the theme itself — only a few hardcoded radius/shadow
  classes (buttons → pill-shaped, cards → added a subtle border for definition against the new
  white-on-white background) were touched directly.

## [Post-5b] — Real-world crawl hardening

Found by manually testing the deployed Phase 5b UI against real sites (not fixtures) — a mix
of ad-heavy/complex sites and a spread from `stripe.com` down to `example.com`.

### Fixed

- **`packages/crawler`**: navigation used `waitUntil: "networkidle"`, which real sites with
  continuous ad/analytics/tracker traffic (news sites, e-commerce) never reach, timing out
  otherwise-fine crawls. Switched to `waitUntil: "load"` plus a short (5s) best-effort
  network-idle grace window that never blocks the crawl if the page keeps chattering.
- **`packages/extractor`**: two schema-validation crashes from real-world CSS that the fixture
  site never exercised, both the same root cause — a magnitude-only scale (`spacing`,
  `animations.durations`) ingesting a value that's legitimately negative in a different sense:
  - Negative CSS margins (a common overlap technique) were feeding the `spacing` scale, which
    `SpacingScaleSchema` requires non-negative. Now dropped rather than misread as spacing.
  - The `transition`/`animation` shorthand's `delay` token (legitimately negative — starts a
    transition partway through) was being parsed as a `duration`, which
    `AnimationsSchema.durations` requires non-negative. Now dropped rather than misread as a
    duration.
- **`apps/web`**: three issues surfaced only under real usage:
  - Playwright error messages embed raw ANSI escape codes unconditionally; they were leaking
    into the UI's error/log text as garbled characters. Now sanitized at the point every log
    entry and job error enters the app.
  - `LocalFsJobStore`'s writes weren't atomic (`writeFile` truncates before writing new
    content), so a `GET /brand/:id` poll landing mid-write could read a torn/empty file and
    fail to parse it — surfacing to users as a false "Job not found." Fixed via temp-file +
    atomic rename, with a concurrency regression test.
  - The live-progress page treated any single failed poll as fatal, ending the flow even for a
    job that was still running fine. Now only a definitive 404 stops polling; other failures
    retry (capped) before giving up.
  - Widened the web app's own crawl timeout budget (45s nav / 75s total) — real pages are
    sometimes just slower to load, and a full-page screenshot of a very long page can itself
    take a while once navigation has already succeeded.

## [Phase 5b] — Web UI

### Added

- Light Mode Skeumorphism UI, per project direction (see Phase 5a's "Style direction" entry
  below): a warm/paper Tailwind v4 theme (`app/globals.css`, CSS-based `@theme` — no
  `tailwind.config.ts`) with an inset/outset shadow scale (`--shadow-raised`, `--shadow-pressed`,
  `--shadow-well`) for tactile depth. No dark mode, no theme toggle.
- `components/ui/*`: hand-built shadcn/ui-style primitives (Button, Input, Card, Badge,
  `ProgressDial` — a circular gauge, not a flat bar) on top of the theme tokens, via
  `class-variance-authority` and `lib/utils.ts`'s `cn()`.
- `components/brand-kit/*`: `ColorSwatchGrid`, `TypeScaleCard`, `LogoPreview`, `TokenScaleRow`,
  `ComponentsEmptyState` — pure presentational components rendering `BrandJson` slices;
  `ComponentsEmptyState` renders an honest empty state, since component detection isn't
  implemented in any phase.
- `app/page.tsx`: landing page + URL input, validated client-side with a local Zod schema kept
  deliberately separate from `src/schema.ts` (which transitively imports the crawler/Playwright
  chain and must never reach the browser bundle).
- `app/analyze/[id]/page.tsx`: polls `GET /brand/:id` every 1.5s, renders the job's live `logs`
  stream (Framer Motion fade-in) and a `ProgressDial` while in progress, swaps in the Brand Kit
  viewer once `status === "done"`, shows the job's `error` on `status === "failed"`.
- `:focus-visible` styling renders every interactive control as visibly pressed/lit — part of
  the skeuomorphic language, not a bolted-on outline; verified with keyboard-only navigation.
- `e2e/analyze.spec.ts` (Playwright, first in the repo) — the spec's literal acceptance
  criterion: a real Chromium browser drives a real `next dev` server against
  `packages/crawler`'s local fixture site end to end. `E2E_ALLOW_PRIVATE_NETWORK=1`
  (`playwright.config.ts`'s `webServer.env` only) lets the route handler crawl the fixture
  server's loopback address for this run.
- Root `package.json`/`turbo.json`: `pnpm test:e2e` (`turbo run test:e2e`), per `Claude.md`'s
  already-documented verification command.

## [Phase 5a] — API

### Added

- `apps/web` is now a real Next.js app: Hono routes mounted at `/api` via a single catch-all
  route handler (`app/api/[[...route]]/route.ts`) — one process serves API + UI.
- `POST /analyze`, `GET /brand/:id` (doubles as the status endpoint), `GET /assets/:id`,
  `GET /components/:id`, `GET /api/openapi.json`.
- In-process async job model (`src/jobs.ts`): `queued → crawling → extracting → analyzing (if
`ANTHROPIC_API_KEY` set) → done`/`failed`. Every pipeline package's `onLog` now actually gets
  consumed — server console (`src/log.ts`) and each job's persisted `logs`.
- `JobStore`/`AssetStore` interfaces (`src/storage/`): a fully-tested local filesystem adapter
  (default, zero env vars) plus real Supabase (jobs) and Cloudflare R2 (assets) adapters,
  constructed only when their env vars are set, untested here (no credentials available) — same
  spirit as `AnthropicVisionProvider` in Phase 3.
- In-memory sliding-window rate limiter (`src/rate-limit.ts`) on `POST /analyze`.
- OpenAPI 3.0 document generated from the same Zod schemas the routes validate against, via
  `@asteasolutions/zod-to-openapi` (zod v3) — not `@hono/zod-openapi`, which requires zod v4 and
  would fork the whole monorepo's zod version.
- Backend integration tests (`src/app.test.ts`, `src/jobs.test.ts`) exercise the full
  crawl→extract→merge→API flow against `packages/crawler`'s local fixture site — never a live
  site — the acceptance-criterion E2E proxy until Phase 5b adds the real Playwright test.
- Root `eslint.config.mjs` now ignores `.next/` and supports `varsIgnorePattern` for
  intentionally-unused destructured vars (e.g. omitting a field via rest-spread).
- Root `turbo.json`'s `build` task outputs now include `.next/**` (excluding its cache dir).

### Style direction

- The web UI (Phase 5b) will be **Light Mode Skeumorphism**, per project direction — this
  supersedes `Claude.md`'s original "dark mode" bullet; dark mode is dropped entirely rather
  than kept alongside it.

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
