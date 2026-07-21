# Changelog

All notable changes to this project are documented here, in [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
format. This project doesn't ship versioned releases yet (see [ROADMAP via Claude.md](./Claude.md)),
so entries are grouped by phase rather than version number.

## [Phase 1] — Crawler

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
