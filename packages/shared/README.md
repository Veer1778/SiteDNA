# @brandkit/shared

Brand JSON Zod schema and shared types — the single source of truth every BrandKit AI package
consumes. See [`docs/BRAND_JSON.md`](../../docs/BRAND_JSON.md) for the human-readable field
reference, and [`ARCHITECTURE.md`](../../ARCHITECTURE.md) for why this package has no
dependency on any other package in the repo.

## Exports

- `BrandJsonSchema` / `BrandJson` — the root schema and its inferred type.
- `SCHEMA_VERSION` — the current schema version literal (`"1.0.0"`).
- Sub-schemas and types for each section: `ColorRolesSchema`, `TypographySchema`,
  `SpacingScaleSchema`, `RadiusScaleSchema`, `ShadowsSchema`, `AnimationsSchema`,
  `ComponentsSchema`, `VoiceSchema`, `StyleClassificationSchema`, `LogoSchema` — all in
  [`src/schema/`](./src/schema), one file per section.

## Fixtures

[`examples/fixtures/brand-json/`](./examples/fixtures/brand-json) has one valid document and
five invalid ones (each violating exactly one constraint), used by the round-trip test in
[`src/schema/brand-json.test.ts`](./src/schema/brand-json.test.ts).

## Build/test in isolation

```sh
pnpm --filter @brandkit/shared build
pnpm --filter @brandkit/shared test
```
