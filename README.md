# BrandKit AI

Open-source website branding extraction platform. Paste a public URL; BrandKit AI crawls it,
extracts brand assets (logo, colors, typography, icons, images, spacing, radius, shadows),
detects UI components, classifies design language with Vision AI, and generates an editable
Brand Kit with social templates and multi-format export.

**Status**: Phase 0 — scaffold only. The monorepo builds, lints, and tests green, and the
Brand JSON schema (the platform's single source of truth) is fully specified. No crawling,
extraction, or UI features exist yet. See [Claude.md](./Claude.md) for the full phased plan and
[ARCHITECTURE.md](./ARCHITECTURE.md) for how the packages fit together.

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

## Monorepo layout

| Path                       | Purpose                                                                  |
| -------------------------- | ------------------------------------------------------------------------ |
| `apps/web`                 | Next.js app + Hono API routes; the vertical-slice product surface        |
| `packages/shared`          | Brand JSON Zod schema and types — the single source of truth             |
| `packages/crawler`         | Playwright crawler → normalized, SSRF-hardened crawl artifact            |
| `packages/extractor`       | Crawl artifact → raw design tokens (color, type, logo, spacing, shadows) |
| `packages/vision`          | Vision AI classification of design language, voice, and style            |
| `packages/brand-engine`    | Merges crawler + extractor + vision output into final Brand JSON         |
| `packages/template-engine` | Brand JSON → branded social/marketing template scene graphs              |
| `packages/editor`          | Canva-like React + Fabric.js template editor                             |
| `packages/exporters`       | Brand JSON / scene graphs → PNG, SVG, PDF, PSD, dev tokens               |
| `packages/ui`              | Shared shadcn/ui component library                                       |
| `docs/`                    | Reference documentation (schema reference, etc.)                         |
| `examples/`                | Fixtures and example data used across package tests                      |

Each package has its own README with build/test instructions specific to it.

## Setup

Requires Node 20+ (see `.nvmrc`) and pnpm 9 (see `packageManager` in `package.json`).

```sh
pnpm install
```

## Verification commands

- Build: `pnpm build`
- Test: `pnpm test`
- Lint: `pnpm lint`
- Dependency-cycle / layering check: `pnpm check:deps`
- Format check: `pnpm format:check` (or `pnpm format` to fix)
- Dev (once apps exist with a dev server, from Phase 5 onward): `pnpm dev`

All of the above must pass before any change is considered done — see the root
[Claude.md](./Claude.md) rules section.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

[MIT](./LICENSE)
