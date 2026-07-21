# @brandkit/exporters

Exports `BrandJson` and template scene graphs to every target format: PNG/SVG (raster/vector),
PDF brand guide (`@react-pdf/renderer`), layered PSD (`ag-psd`), and developer token formats
(CSS variables, SCSS, Tailwind config, Style Dictionary, raw JSON). Implemented in Phase 8 (see
[Claude.md](../../Claude.md)).

## Current state (Phase 0)

Stub — depends on `@brandkit/shared` and re-exports the `BrandJson` type to confirm the
workspace dependency resolves. Format exporters land in Phase 8.

## Build/test in isolation

```sh
pnpm --filter @brandkit/exporters build
pnpm --filter @brandkit/exporters test
```
