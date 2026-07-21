```md
# BrandKit AI

Open-source website branding extraction platform. A user pastes a public URL; the platform crawls it, extracts brand assets (logo, colors, typography, icons, images, spacing, radius, shadows), detects components, classifies design language with Vision AI, and generates an editable Brand Kit with social templates and multi-format export.

## Stack

- Monorepo: Turborepo + pnpm
- Frontend: Next.js (App Router), React, TypeScript, Tailwind, shadcn/ui, Framer Motion
- Backend: Hono on Node.js
- Crawler: Playwright; parsing via Cheerio, PostCSS, css-tree
- Images: Sharp; Color: node-vibrant, culori
- Editor canvas: Fabric.js
- Export: @react-pdf/renderer, ag-psd
- Validation: Zod everywhere at package boundaries
- DB: Supabase; Storage: Cloudflare R2
- Tests: Vitest (unit/integration), Playwright (E2E)
- Lint/format: ESLint + Prettier

## Monorepo layout

apps/web
packages/crawler, extractor, vision, brand-engine, template-engine, editor, exporters, shared, ui
docs/, examples/, .github/

## Rules

- Plan before implementing: state approach, affected files, and why. Then implement, test, document.
- Strict TypeScript. `"strict": true`. Never `any`. No `@ts-ignore` without a comment explaining why.
- No placeholder implementations, no TODOs in core paths. If something must be deferred, raise it and get approval first.
- Every package independently buildable and reusable. No circular deps (enforce with dependency-cruiser in CI).
- Brand JSON (packages/shared) is the single source of truth. Every feature consumes it. Never invent parallel schemas.
- Zod schemas define all boundaries: API request/response, Brand JSON, package inputs/outputs. Infer TS types from Zod, never duplicate.
- Small pure functions where possible. No magic numbers, extract named constants.
- Security: validate and normalize URLs, block private IP ranges (SSRF), cap redirects, timeout all crawls, sanitize any rendered HTML, rate-limit /analyze.
- Conventional Commits. One logical change per commit. Feature branches.
- After any change: `pnpm build && pnpm test && pnpm lint` must pass before declaring done.

## Verification commands

- Build: `pnpm build`
- Test: `pnpm test`
- Lint: `pnpm lint`
- E2E: `pnpm test:e2e`
- Dep check: `pnpm check:deps`
```

---

## Phase 0 — Scaffold and shared foundation

Goal: a monorepo that builds, lints, and tests green with zero features.

Deliverables:

- Turborepo + pnpm workspace with all packages and apps/web stubbed as real buildable packages (each with `src/index.ts`, tsconfig, vitest config).
- `packages/shared`: the complete Brand JSON Zod schema. This is the most important artifact of the phase. Model: logo (light/dark/favicon variants), color roles (primary, secondary, accent, surface, background, text, border, success, warning, danger) with confidence scores, typography (heading/body families, weights, sizes, letterSpacing, lineHeights), spacing scale, radius scale, shadows, animations, components (type, screenshot ref, bounding box), voice/personality, styleClassification. All fields typed, documented with JSDoc, versioned (`schemaVersion`).
- Root tooling: strict tsconfig base, ESLint flat config, Prettier, Vitest workspace, dependency-cruiser config forbidding cycles, `.github/workflows/ci.yml` running build/lint/test.
- MIT LICENSE, root README stub, CONTRIBUTING stub.

Acceptance:

- `pnpm build`, `pnpm lint`, `pnpm test`, `pnpm check:deps` all pass.
- Brand JSON schema has round-trip tests (parse a full valid fixture, reject 5+ invalid fixtures).

## Phase 1 — Crawler

Goal: `packages/crawler` fetches a URL and returns a normalized crawl artifact.

Deliverables:

- Playwright-based crawl of a single page (configurable to N same-origin pages later, but ship single page first).
- Output: rendered HTML, all stylesheets (inline + linked, fetched and concatenated per origin), computed styles for key elements, full-page + viewport screenshots, list of image/font/icon asset URLs with content types and dimensions, favicon candidates.
- Security hardening: URL normalization, DNS resolution check against private/reserved ranges, redirect cap, request/total timeouts, max response sizes, robots.txt respect flag.
- Deterministic artifact shape validated by Zod; serializable to disk for fixtures.

Acceptance:

- Unit tests for URL validation/SSRF guards (localhost, 169.254.x, RFC1918, redirect-to-private all rejected).
- Integration test crawling a local fixture site served by the test suite (never live sites in CI).
- Crawling one real site manually produces a valid artifact.

## Phase 2 — Extractors

Goal: `packages/extractor` turns a crawl artifact into raw design tokens.

Deliverables, each as its own module with its own tests:

- Colors: parse CSS + sample screenshots via Sharp/node-vibrant; cluster perceptually similar colors with culori (deltaE), assign roles heuristically (background from body, text from computed color, primary from buttons/links frequency), output with confidence scores.
- Typography: font-family stacks from computed styles of h1–h6 vs body, weights/sizes/line-heights/letter-spacing actually used, dedupe fallback stacks.
- Logo: candidates from `<img>` near header/nav, SVGs with brand-ish heuristics, apple-touch-icon, og:image, favicon; rank candidates; detect light/dark variants by luminance analysis.
- Tokens: CSS custom properties, spacing values clustered into a scale, border-radius clusters, box-shadow dedupe, transition/animation summary.
- Assets: classify images as icon/illustration/photo by size, format, and color complexity heuristics (Vision AI refines this in Phase 3).

Acceptance:

- Each extractor has fixture-based unit tests (recorded crawl artifacts in `examples/fixtures/`).
- End-to-end extractor test: fixture artifact in → valid partial Brand JSON out.

## Phase 3 — Vision AI

Goal: `packages/vision` classifies visual identity from screenshots.

Deliverables:

- Provider-agnostic interface (`VisionProvider`) with one concrete implementation (Anthropic API, model configurable via env). No hardcoded keys.
- Prompts that demand structured JSON only; responses validated with Zod, with one retry-on-invalid.
- Classifies: design language (modern, corporate, luxury, editorial, minimal, neobrutalism, glassmorphism, material, apple-like, stripe-like — multi-label with scores), brand personality, voice, photography style, illustration style, spacing density, animation style.
- Refines Phase 2 asset classification and logo ranking.
- Mockable: all tests run against a fake provider with recorded responses. Zero live API calls in CI.

Acceptance:

- Schema-validation tests including malformed-response handling.
- Cost guard: max images per analysis, images downscaled before sending.

## Phase 4 — Brand engine

Goal: `packages/brand-engine` merges crawler + extractor + vision output into one final Brand JSON.

Deliverables:

- Deterministic merge pipeline with conflict resolution rules (e.g., vision overrides heuristic asset classes above a confidence threshold).
- Completeness scoring and gap report (what's missing, what's low-confidence).
- Serialization/versioning + migration stub for future schema versions.

Acceptance:

- Golden-file tests: fixture inputs → committed expected Brand JSON, diffed in CI.
- Property test: output always validates against shared schema.

## Phase 5 — API + minimal web app

Goal: the vertical slice works end to end in the browser.

Deliverables:

- `apps/web` API routes backed by Hono: `POST /analyze` (starts job), `GET /brand/:id`, `GET /assets/:id`, `GET /components/:id`. Async job model with progress states (queued, crawling, extracting, analyzing, done, failed). Zod-validated, OpenAPI spec generated from the Zod schemas.
- Persistence: Supabase for jobs/brands, R2 for screenshots/assets, with a local filesystem adapter so dev and CI need no cloud credentials. Storage behind an interface.
- Rate limiting on /analyze.
- Web UI: landing page, URL input, live analysis progress, Brand Kit viewer (colors, typography, logo, tokens, component screenshots). Dark mode, responsive, keyboard-navigable.

Acceptance:

- Playwright E2E: submit fixture-site URL → progress → rendered brand kit.
- `pnpm dev` works with zero env vars using local adapters.

## Phase 6 — Template engine

Goal: `packages/template-engine` generates branded social templates from Brand JSON.

Deliverables:

- Template definition format (JSON, Zod-validated): layers, bindings to Brand JSON paths, constraints.
- Formats: Instagram square/story, LinkedIn post/banner, Facebook cover, Pinterest pin, Twitter header, YouTube thumbnail, newsletter header, blog banner.
- Website-type presets (agency, blog, startup, restaurant, healthcare, education, portfolio) that select layouts and copy tone.
- Renders to a Fabric.js-compatible scene graph (consumed by Phase 7 editor and Phase 8 export).
- Automatic contrast checking when placing text on brand colors (WCAG AA), with fallback color selection.

Acceptance:

- Snapshot tests: fixture Brand JSON → deterministic scene graphs for every format.
- UI: template gallery page rendering previews.

## Phase 7 — Editor

Goal: Canva-like editing of generated templates.

Deliverables:

- `packages/editor` (React + Fabric.js): move, resize, rotate, text editing, image replace, layers panel, grouping, alignment tools, snap guides, zoom, undo/redo via command-pattern history, keyboard shortcuts.
- Editor state serializes back to the scene-graph format (round-trip safe).
- Accessible where feasible: focus management, shortcut help, ARIA on all chrome.

Acceptance:

- Unit tests on history/commands and serialization round-trips.
- Playwright E2E: open template, edit text, move layer, undo, save.

Note: this is the largest phase. Split into 7a (canvas + transform + text) and 7b (layers, history, snapping, shortcuts) as separate sessions.

## Phase 8 — Exporters

Goal: `packages/exporters` outputs every target format from Brand JSON + scene graphs.

Deliverables:

- Raster/vector: PNG (server-side via canvas render), SVG (scene graph → SVG).
- PDF via @react-pdf/renderer (brand guide document: logo, palette, type specimens, tokens).
- PSD via ag-psd (layered export of templates).
- Dev formats from Brand JSON: CSS variables, SCSS, Tailwind config, Style Dictionary tokens, raw JSON.
- `/export` API route + Downloads UI.

Acceptance:

- Golden-file tests for CSS/SCSS/Tailwind/Style Dictionary outputs.
- PNG/SVG/PDF/PSD smoke tests: files generate, parse back, correct dimensions/layer counts.

## Phase 9 — Hardening, docs, release

Goal: open-source ready.

Deliverables:

- Docs: full README, ARCHITECTURE.md (with package dependency diagram), API docs from OpenAPI, CONTRIBUTING, SECURITY.md, ROADMAP, CHANGELOG, examples/.
- Performance pass: code splitting, image optimization, list virtualization in galleries, caching of crawl artifacts, worker threads for Sharp-heavy extraction.
- Accessibility audit against WCAG AA on all app pages.
- Coverage report; raise to agreed target on core packages (crawler, extractor, brand-engine, template-engine, exporters). Treat 90% as a target for core logic, not UI chrome.
- Release workflow: changesets, versioned packages, GitHub Actions release.

Acceptance:

- CI fully green including E2E and coverage thresholds.
- Fresh-clone test: `pnpm i && pnpm dev` works from README alone.

---

## Session prompts (copy-paste per phase)

Phase start:

> Read SPEC.md and CLAUDE.md. We are starting Phase N. Before writing any code: state your approach, list the files you'll create or change, and flag anything in the spec that's ambiguous or that you'd cut. Wait for my approval.

Phase end:

> Run pnpm build, pnpm test, pnpm lint, pnpm check:deps. Show me the output. Walk through each Phase N acceptance criterion and prove it passes. Then write the commit(s) using Conventional Commits.

If it drifts:

> Stop. That's out of scope for this phase. Note it in ROADMAP.md and return to the current acceptance criteria.
