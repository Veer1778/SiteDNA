# Brand JSON reference

Brand JSON is the platform's single source of truth for an extracted brand identity, defined
as a Zod schema in [`packages/shared/src/schema`](../packages/shared/src/schema). This document
is the human-readable companion to that schema — every field here has a matching JSDoc comment
on the corresponding Zod field; if they ever disagree, the code is authoritative.

Current schema version: **`1.0.0`** (`SCHEMA_VERSION` in
[`brand-json.ts`](../packages/shared/src/schema/brand-json.ts)).

## Top level (`BrandJson`)

| Field                 | Type                                     | Notes                                                           |
| --------------------- | ---------------------------------------- | --------------------------------------------------------------- |
| `schemaVersion`       | literal `"1.0.0"`                        | Bump on breaking shape changes; pair with a migration (Phase 4) |
| `sourceUrl`           | URL string                               | Canonical URL this kit was extracted from                       |
| `extractedAt`         | ISO 8601 datetime string                 | When extraction completed                                       |
| `logo`                | [`Logo`](#logo)                          |                                                                 |
| `colors`              | [`ColorRoles`](#colors)                  |                                                                 |
| `typography`          | [`Typography`](#typography)              |                                                                 |
| `spacing`             | `number[]` (px)                          | Sorted ascending spacing scale                                  |
| `radius`              | `number[]` (px)                          | Sorted ascending border-radius scale                            |
| `shadows`             | [`Shadow[]`](#shadows)                   | Deduped `box-shadow` layers                                     |
| `animations`          | [`Animations`](#animations)              |                                                                 |
| `components`          | [`DetectedComponent[]`](#components)     |                                                                 |
| `voice`               | `string[]`                               | Freeform brand personality descriptors                          |
| `styleClassification` | [`ScoredLabel[]`](#style-classification) |                                                                 |

## Logo

`light`, `dark`, and `favicon` are each an optional `LogoAsset`:

| Field    | Type                                                            |
| -------- | --------------------------------------------------------------- |
| `url`    | string (absolute URL or storage reference)                      |
| `width`  | positive number (px, intrinsic)                                 |
| `height` | positive number (px, intrinsic)                                 |
| `format` | `"png" \| "jpg" \| "webp" \| "svg" \| "ico" \| "gif" \| "avif"` |

## Colors

`ColorRoles` has one optional `ColorValue` per role: `primary`, `secondary`, `accent`,
`surface`, `background`, `text`, `border`, `success`, `warning`, `danger`.

`ColorValue`:

| Field        | Type                                      |
| ------------ | ----------------------------------------- |
| `hex`        | lowercase 6-digit hex, `/^#[0-9a-f]{6}$/` |
| `confidence` | number, `0`–`1`                           |

## Typography

`Typography` has `heading` and `body`, each a `TypeScale`:

| Field           | Type               | Notes                               |
| --------------- | ------------------ | ----------------------------------- |
| `families`      | `string[]` (min 1) | Font stack in cascade order         |
| `weights`       | `number[]` (min 1) | Integers 1–1000, as observed in use |
| `sizes`         | `number[]` (min 1) | Pixels, as observed in use          |
| `letterSpacing` | `number[]`         | Pixels, may be negative             |
| `lineHeights`   | `number[]`         | Unitless multipliers                |

## Shadows

Each `Shadow`:

| Field     | Type                             |
| --------- | -------------------------------- |
| `offsetX` | number (px)                      |
| `offsetY` | number (px)                      |
| `blur`    | number ≥ 0 (px)                  |
| `spread`  | number (px, may be negative)     |
| `color`   | hex string (alpha not preserved) |
| `inset`   | boolean                          |

## Animations

| Field       | Type       | Notes                                      |
| ----------- | ---------- | ------------------------------------------ |
| `durations` | `number[]` | Milliseconds, ≥ 0                          |
| `easings`   | `string[]` | e.g. `"ease-in-out"`, cubic-bezier strings |

## Components

Each `DetectedComponent`:

| Field           | Type                                                                                                                             |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `type`          | `"button" \| "input" \| "card" \| "nav" \| "footer" \| "hero" \| "modal" \| "badge" \| "avatar" \| "table" \| "form" \| "other"` |
| `screenshotRef` | string (storage key or URL for the cropped screenshot)                                                                           |
| `boundingBox`   | `{ x, y, width, height }`, pixels, origin top-left of the source screenshot                                                      |

## Style classification

`styleClassification` is an array of `ScoredLabel`:

| Field   | Type                                                                                                                                                  |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `label` | `"modern" \| "corporate" \| "luxury" \| "editorial" \| "minimal" \| "neobrutalism" \| "glassmorphism" \| "material" \| "apple-like" \| "stripe-like"` |
| `score` | number, `0`–`1` (multi-label — several may score highly at once)                                                                                      |

## Fixtures

[`packages/shared/examples/fixtures/brand-json/`](../packages/shared/examples/fixtures/brand-json)
has one full valid document (`valid.json`) and five invalid documents, each violating exactly
one constraint (bad hex color, out-of-range confidence, missing required field, wrong type,
unsupported schema version) — used by
[`brand-json.test.ts`](../packages/shared/src/schema/brand-json.test.ts) to round-trip-test the
schema.
