# @brandkit/web

Next.js (App Router) app with Hono-backed API routes, mounted at `/api` via a single catch-all
route handler — one `next dev`/`next build`/deployed process serves both the API and the UI. See
[Claude.md](../../Claude.md) and [ARCHITECTURE.md](../../ARCHITECTURE.md).

**Phase 5 is split into 5a (this — the API) and 5b (the web UI)**; 5b adds the actual
Light-Mode-Skeumorphism frontend. For now `app/page.tsx` is a placeholder.

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

## Testing

`src/app.test.ts` and `src/jobs.test.ts` are full backend integration tests: they crawl
`packages/crawler`'s local static fixture site (never a live site — `startFixtureServer` in
`src/test-utils.ts`) through the real Hono app (`app.request(...)`, no HTTP server needed) or
`runJob` directly, and assert a valid `BrandJson` comes back. This is the acceptance criterion's
E2E proxy until 5b adds the real browser-driven Playwright test.

## Build/test in isolation

```sh
pnpm --filter @brandkit/web build
pnpm --filter @brandkit/web test
pnpm --filter @brandkit/web dev
```
