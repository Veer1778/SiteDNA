# @brandkit/web

Next.js (App Router) app with Hono-backed API routes, mounted at `/api` via a single catch-all
route handler — one `next dev`/`next build`/deployed process serves both the API and the UI. See
[Claude.md](../../Claude.md) and [ARCHITECTURE.md](../../ARCHITECTURE.md).

**Phase 5 is split into 5a (the API) and 5b (this — the web UI)**: a Light Mode Skeumorphism
frontend — landing page, live analysis progress, and a Brand Kit viewer. No dark mode, no theme
toggle, by design (see the Style direction section of `CHANGELOG.md`).

## Routes

| Route                 | Method | Description                                                                                                                                                       |
| --------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/api/analyze`        | POST   | Starts an async job for a URL. Rate-limited. Returns `202 { id, status }`.                                                                                        |
| `/api/brand/:id`      | GET    | Doubles as the status endpoint — no separate `GET /jobs/:id`. Returns the job (minus `url`): `status`, `logs`, `assets`, and `brandKit`/`error` once done/failed. |
| `/api/assets/:id`     | GET    | Streams a stored asset's raw bytes (e.g. a screenshot) by its opaque id.                                                                                          |
| `/api/components/:id` | GET    | `:id` is a job id. Returns `{ components }` — currently always `[]`, since no phase implements component detection yet.                                           |
| `/api/openapi.json`   | GET    | The OpenAPI 3.0 document, generated from the same Zod schemas the routes validate against.                                                                        |

## The async job model

`POST /analyze` creates a job (`status: "queued"`) and returns immediately; `src/jobs.ts`'s
`runJob` then runs in the background: `crawling → extracting → analyzing (if Vision AI is
configured) → done`/`failed`. There's no real job queue — this is an in-process fire-and-forget
async function, appropriate for a "minimal web app" with a single dev-mode process (see
`Claude.md`'s stack list, which doesn't include one).

Vision AI runs only if `ANTHROPIC_API_KEY` is set; otherwise the job goes straight from
`extracting` to `done` and `voice`/`styleClassification` are just `[]`.

## Storage

`JobStore`/`AssetStore` interfaces (`src/storage/types.ts`), each with two implementations:

- **Local filesystem** (`src/storage/local-fs.ts`) — the default, zero-env-var adapter. Jobs
  under `.data/jobs/`, assets under `.data/assets/` (gitignored). The only adapter any test in
  this package touches.
- **Supabase** (jobs) / **Cloudflare R2** (assets) — real implementations behind the same
  interfaces, used automatically once their env vars are set (see `.env.example`), never
  exercised by a test here (no credentials available) — same spirit as
  `packages/vision`'s `AnthropicVisionProvider`.

`src/storage/store-factory.ts` picks the adapter.

## Project logging

Every pipeline package's `onLog` (crawler/extractor/vision/brand-engine) finally gets consumed
here, in two places: the server console (`src/log.ts`'s `consoleLogger`) and each job's
persisted `logs` array, returned by `GET /brand/:id` — the web UI's "live analysis progress" in
5b reads this, a real log stream rather than a fake progress bar.

## Rate limiting

`src/rate-limit.ts`: an in-memory sliding-window limiter (10 req/min/client by default),
applied to `POST /analyze` only. Explicitly single-instance/dev-appropriate — it doesn't survive
multiple server instances; a real multi-instance deployment would need a shared store instead.

## OpenAPI

`src/openapi.ts` builds the document with `@asteasolutions/zod-to-openapi` (v7, zod v3) —
**not** `@hono/zod-openapi`, which requires zod v4 and would fork the whole monorepo's zod
version (every schema here, including `packages/shared`'s `BrandJsonSchema`, is zod v3).

## Environment

See `.env.example`. Everything is optional — `pnpm dev`/`build`/`test` all work with zero env
vars using the local adapters and no Vision AI.

## Web UI (5b)

- **Theme**: `app/globals.css` defines the Light Mode Skeumorphism design tokens via Tailwind
  v4's CSS-based `@theme` (no `tailwind.config.ts` — Tailwind v4 doesn't need one). Warm/paper
  palette (`--color-paper*`, `--color-ink*`), one fixed accent, and an inset/outset shadow scale
  (`--shadow-raised`, `--shadow-pressed`, `--shadow-well`) that gives buttons/cards a tactile,
  pressable feel. This is BrandKit AI's own UI theme — unrelated to any `BrandJson` a user
  analyzes.
- **Components**: `components/ui/*` are small hand-built shadcn/ui-style primitives (Button,
  Input, Card, Badge, ProgressDial) styled with the tokens above via `class-variance-authority`
  - `lib/utils.ts`'s `cn()`. `components/brand-kit/*` render `BrandJson` slices
    (`ColorSwatchGrid`, `TypeScaleCard`, `LogoPreview`, `TokenScaleRow`,
    `ComponentsEmptyState` — the last renders an honest empty state since component detection
    isn't implemented in any phase yet).
- **Pages**: `app/page.tsx` (landing page + URL input, client-validated with a local Zod schema
  — deliberately not importing `src/schema.ts`, which pulls in `@brandkit/brand-engine` and the
  crawler/Playwright chain and must never reach the browser bundle) and
  `app/analyze/[id]/page.tsx` (polls `GET /brand/:id` every 1.5s, renders the live `logs` stream
  and a `ProgressDial`, swaps in the Brand Kit viewer once `status === "done"`).
- **Motion**: Framer Motion drives the log stream's fade-in (`AnimatePresence`); button
  press/depress is plain CSS (`active:shadow-pressed`) to avoid Framer's `motion.button` prop
  types colliding with native `ButtonHTMLAttributes`.
- **Focus states**: `:focus-visible` in `globals.css` renders as a pressed/lit ring — part of
  the tactile design language, not a bolted-on outline.

## Testing

`src/app.test.ts` and `src/jobs.test.ts` are backend integration tests (Vitest): they crawl
`packages/crawler`'s local static fixture site (never a live site — `startFixtureServer` in
`src/test-utils.ts`) through the real Hono app (`app.request(...)`, no HTTP server needed) or
`runJob` directly, and assert a valid `BrandJson` comes back.

`e2e/analyze.spec.ts` (Playwright, `pnpm test:e2e`) is the spec's literal acceptance criterion:
starts the same local fixture server, drives a real `next dev` server (`playwright.config.ts`'s
`webServer`) through a real Chromium browser — submits the fixture URL on the landing page,
waits for the analyze page to reach `done`, and asserts the rendered Brand Kit. The route handler
only allows crawling private/loopback addresses (needed to reach the fixture server) when
`E2E_ALLOW_PRIVATE_NETWORK=1`, which `playwright.config.ts` sets on its `webServer` process only
— never set this outside of that test run.

## Build/test in isolation

```sh
pnpm --filter @brandkit/web build
pnpm --filter @brandkit/web test
pnpm --filter @brandkit/web test:e2e
pnpm --filter @brandkit/web dev
```
