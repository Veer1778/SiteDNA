# Architecture

## Why `packages/shared` is the single source of truth

Every package in this monorepo either produces a piece of Brand JSON or consumes the whole
document — never both a real schema and an ad-hoc parallel shape. `packages/shared` owns the
[Zod](https://zod.dev) schema (`BrandJsonSchema`) and the TypeScript types inferred from it
(`z.infer`). This gives the platform one place to change when the brand model evolves, one
runtime validator at every package boundary, and no drift between what a producer emits and
what a consumer expects.

Concretely: `packages/extractor` and `packages/vision` each produce _partial_ Brand JSON
(colors/typography/tokens from extraction, voice/styleClassification from vision).
`packages/brand-engine` is the only package that assembles a _complete, valid_ `BrandJson` by
merging those partials — see Phase 4 in [Claude.md](./Claude.md). Everything downstream
(`template-engine`, `editor`, `exporters`, `apps/web`) reads that complete document, never a
package-specific shape.

## Dependency graph

```
apps/web
  ├─ packages/crawler, extractor, vision, brand-engine (the pipeline, called from src/jobs.ts)
  └─ packages/shared

packages/brand-engine
  ├─ packages/crawler   (CrawlArtifact for sourceUrl/extractedAt)
  ├─ packages/extractor (ExtractionResult — the merge pipeline's main input)
  ├─ packages/vision    (VisionClassification — optional merge input)
  └─ packages/shared    (BrandJsonSchema — what it assembles and validates against)

packages/template-engine
  └─ packages/shared

packages/exporters
  └─ packages/shared

packages/crawler        (standalone — produces a crawl artifact, not Brand JSON)

packages/extractor
  ├─ packages/crawler   (its input type, CrawlArtifact, plus the reused SSRF-guarded fetch)
  └─ packages/shared    (the Brand JSON sub-schemas it produces: colors, typography, logo, ...)

packages/vision
  ├─ packages/crawler   (its input type, CrawlArtifact/screenshots, via classifyFromCrawlArtifact)
  └─ packages/shared    (reuses StyleClassificationSchema, VoiceSchema, ConfidenceSchema, ...)

packages/editor          (standalone in Phase 0; will depend on packages/template-engine's
                           scene-graph output from Phase 7)
packages/ui              (standalone — no Brand JSON dependency; pure component library)
```

`packages/shared` has no dependencies on any other package in this repo — it sits at the
bottom of the graph by construction. `.dependency-cruiser.cjs` enforces two invariants in CI
(`pnpm check:deps`):

1. **No circular dependencies**, anywhere in the graph.
2. **Nothing under `packages/*` may depend on `apps/web`** — `apps/web` is the top of the
   graph (the product surface), never a dependency of a library package.

## Data flow (end state, Phase 5+)

```
URL ──▶ crawler ──▶ crawl artifact ──▶ extractor ──▶ partial Brand JSON ┐
                                    └─▶ vision ─────▶ partial Brand JSON ┤
                                                                          ▼
                                                                   brand-engine
                                                                          │
                                                                          ▼
                                                                     Brand JSON
                                                            (packages/shared shape)
                                                            │            │        │
                                                            ▼            ▼        ▼
                                                  template-engine   exporters   apps/web
                                                            │
                                                            ▼
                                                        editor (Fabric.js)
```

## Current state

- **Phase 0** (scaffold): every package/app builds and exports a package-identity constant
  (`PACKAGE_NAME`); `brand-engine`, `template-engine`, `exporters`, and `apps/web` import from
  `packages/shared` since their Phase 0 role already touches Brand JSON directly.
- **Phase 1** (`packages/crawler`): real. `crawlUrl(url, options)` drives Chromium behind an
  SSRF/redirect/size guard and returns a `CrawlArtifact` (its own Zod schema, `src/schema.ts` —
  not part of `packages/shared`, since it's an intermediate shape consumed only by
  `packages/extractor`). Its SSRF-guard utilities (`normalizeUrl`, `resolveAndValidateHost`,
  `isPrivateOrReservedIp`) are public exports, reused by other packages that fetch arbitrary
  URLs found in crawled content instead of re-implementing SSRF protection.
- **Phase 2** (`packages/extractor`): real. `extractAll(artifact, options)` turns a
  `CrawlArtifact` into the Brand JSON pieces it can derive heuristically (colors, typography,
  logo, spacing/radius/shadow/animation scales) plus its own `ClassifiedAsset[]`
  (icon/illustration/photo — not a Brand JSON field; feeds `brand-engine`'s completeness
  scoring in Phase 4 and gets refined by Vision AI in Phase 3). Tested against a real recorded
  `CrawlArtifact` fixture (`examples/fixtures/crawl-artifacts/basic-site/`), never a live crawl.
- **Phase 3** (`packages/vision`): real. `VisionProvider` is a provider-agnostic interface;
  `AnthropicVisionProvider` is the concrete implementation (structured-JSON-only prompts,
  validated against `VisionClassificationSchema` with one retry-on-invalid). Produces
  `styleClassification`/`voice` (direct Brand JSON fields, reused from `packages/shared`) plus
  `photographyStyle`/`illustrationStyle`/`spacingDensity`/`animationStyle` and asset/logo
  refinement _suggestions_ (vision-owned types — same non-Brand-JSON situation as Phase 2's
  `ClassifiedAsset`; `brand-engine` decides whether to apply them in Phase 4). Every test uses
  `FakeVisionProvider` or an injected fake Anthropic client — zero live API calls.
- **Phase 4** (`packages/brand-engine`): real. `mergeBrandJson({ crawlArtifact, extraction,
vision? })` is the deterministic (no I/O) merge pipeline — the first package depending on all
  of crawler/extractor/vision/shared. Returns `BrandKitResult = { brandJson, completeness,
refinedAssets, logoSuggestion }`: `brandJson` is the spec-mandated, schema-validated
  deliverable; `completeness` is a fixed-checklist gap report (including the always-flagged
  `components`, since no phase implements component detection yet); `refinedAssets` applies
  vision's "override above a confidence threshold" rule to extractor's asset classifications;
  `logoSuggestion` passes through vision's logo suggestion without applying it (materializing it
  would need brand-engine to fetch bytes itself, breaking the "no I/O" pipeline). Tested against
  a self-contained recorded fixture (golden-file test) plus a `fast-check` property test
  asserting the output always validates against `BrandJsonSchema`.
- **Phase 5a** (`apps/web`, API half): real. Hono routes mounted into Next.js App Router at
  `/api` via a single catch-all route handler (one process serves both API and UI — no separate
  server). `POST /analyze` starts an in-process async job (`src/jobs.ts`: `crawling →
extracting → analyzing (if configured) → done`/`failed`, no real job queue); `GET /brand/:id`
  doubles as the status endpoint. `JobStore`/`AssetStore` are interfaces with a fully-tested
  local filesystem adapter (default, zero env vars) and real-but-untested Supabase/R2 adapters
  — same spirit as Phase 3's vision provider split. OpenAPI is generated with
  `@asteasolutions/zod-to-openapi` (zod v3), not `@hono/zod-openapi` (zod v4 — would fork the
  whole monorepo's zod version). This is also where every pipeline package's `onLog` finally
  gets consumed for real: server console plus each job's persisted `logs`.
- **Phase 5b** (`apps/web`, web UI half): real. Light Mode Skeumorphism per project direction —
  not the spec's original dark-mode bullet; no dark mode, no theme toggle. Tailwind v4 theme
  tokens (`app/globals.css`, CSS-based `@theme` — no `tailwind.config.ts`) define a warm/paper
  palette and an inset/outset shadow scale for tactile depth; `components/ui/*` are hand-built
  shadcn/ui-style primitives on top of those tokens, `components/brand-kit/*` render `BrandJson`
  slices (colors, typography, logo, spacing/radius/shadow scales, and an honest empty state for
  `components`, since no phase implements detection). `app/page.tsx` (URL input) and
  `app/analyze/[id]/page.tsx` (polls `GET /brand/:id`, renders the live `logs` stream via a
  `ProgressDial`, swaps in the Brand Kit viewer once done) are the two pages. Framer Motion
  drives the log stream's fade-in. `e2e/analyze.spec.ts` (Playwright) is the spec's literal
  acceptance criterion — a real browser drives a real `next dev` server against the crawler's
  local fixture site end to end.
- Everything else still wires up to `packages/shared` as its real logic lands in later phases
  (see the per-package README for each package's target phase).
