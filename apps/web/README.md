# @brandkit/web

Next.js (App Router) app with Hono-backed API routes: `POST /analyze`, `GET /brand/:id`,
`GET /assets/:id`, `GET /components/:id`, plus the web UI (URL input, live analysis progress,
Brand Kit viewer). Implemented in Phase 5 (see [Claude.md](../../Claude.md)); works with zero
env vars in dev via local filesystem storage adapters.

## Current state (Phase 0)

Stub — depends on `@brandkit/shared` and re-exports `SCHEMA_VERSION` as `API_SCHEMA_VERSION` to
confirm the workspace dependency resolves. `pnpm dev` currently just echoes a placeholder
message; a real dev server is added in Phase 5.

## Build/test in isolation

```sh
pnpm --filter @brandkit/web build
pnpm --filter @brandkit/web test
```
