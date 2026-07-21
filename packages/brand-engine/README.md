# @brandkit/brand-engine

Merges `packages/crawler` + `packages/extractor` + `packages/vision` output into one final,
valid `BrandJson`, plus a completeness/gap report and a refined-assets/logo-suggestion side
channel. The first package that depends on all three — see [Claude.md](../../Claude.md) and
[ARCHITECTURE.md](../../ARCHITECTURE.md).

## Usage

```ts
import { crawlUrl } from "@brandkit/crawler";
import { extractAll } from "@brandkit/extractor";
import { AnthropicVisionProvider, classifyFromCrawlArtifact } from "@brandkit/vision";
import { mergeBrandJson } from "@brandkit/brand-engine";

const crawlArtifact = await crawlUrl("https://example.com");
const extraction = await extractAll(crawlArtifact);
const vision = await classifyFromCrawlArtifact(crawlArtifact, new AnthropicVisionProvider());

const { brandJson, completeness, refinedAssets, logoSuggestion } = mergeBrandJson({
  crawlArtifact,
  extraction,
  vision, // optional — omit it and voice/styleClassification are just []
});
```

`brandJson` validates against `@brandkit/shared`'s `BrandJsonSchema` — `mergeBrandJson` asserts
this internally (it throws rather than ever returning something invalid).

## Why the result isn't just `BrandJson`

`BrandJsonSchema` has no `assets` field (same situation `packages/extractor`/`packages/vision`
already hit), so this package's actual output is:

```ts
interface BrandKitResult {
  brandJson: BrandJson; // the spec-mandated deliverable
  completeness: CompletenessReport; // score + gaps — see below
  refinedAssets: ClassifiedAsset[]; // extractor's assets, after vision's overrides
  logoSuggestion: LogoRefinement | null; // vision's suggestion, passed through, not applied
}
```

`logoSuggestion` is never merged into `brandJson.logo`: vision only gives a URL + reason, not the
width/height/format `LogoAssetSchema` requires, and materializing it would mean this package
fetching bytes itself — which breaks "deterministic merge pipeline, no I/O." `brandJson.logo`
always keeps extractor's original; the suggestion is there for a caller (or a future phase) to
act on.

## Conflict resolution

The spec's example rule, implemented in `src/refine-assets.ts`: for each of extractor's
classified assets, if `vision.assetRefinements` has a same-URL entry with
`confidence >= 0.7` (default, configurable via `MergeOptions.assetRefinementConfidenceThreshold`)
that disagrees with extractor's classification, vision wins. Otherwise extractor's stands.

## Completeness / gap report

`src/completeness.ts` runs a fixed checklist (every `ColorRoles` role — including
`success`/`warning`/`danger`, which no phase can currently detect, reported honestly rather than
excluded — every logo slot, non-empty spacing/radius/shadows/animations/voice/
styleClassification, and `components`, which is _always_ flagged since no phase implements
component detection yet) and returns `{ score, gaps }`. Typography is excluded from the
checklist — it has no confidence field and always has some value via a documented fallback
(`packages/extractor`), so a presence check would be vacuous.

## Serialization + migration stub

`src/serialize.ts`: `serializeBrandJson`/`deserializeBrandJson` validate-then-stringify /
parse-then-validate. `migrateBrandJson` is the extension point for future schema versions — an
empty `MIGRATIONS` map today (there's only ever been one `schemaVersion`), throwing
`UnsupportedSchemaVersionError` for anything it doesn't recognize rather than guessing.

## Logging

`mergeBrandJson` takes an optional `onLog` callback (`MergeLogEvent = { level, step, message,
meta? }`, `src/log.ts`), same shape as crawler/extractor/vision's loggers.

## Fixtures

`examples/fixtures/basic-site/` is a self-contained recorded fixture set (crawl artifact +
extraction result + a fixed vision classification + the expected merged `BrandKitResult`) —
regenerate with `pnpm --filter @brandkit/brand-engine record-fixture`. `src/merge.test.ts` has
both the golden-file test (exact match against the committed expected output) and a
`fast-check` property test (`BrandJsonSchema.safeParse(...).success` across 200+ randomized
extraction/vision inputs).

## Build/test in isolation

```sh
pnpm --filter @brandkit/brand-engine build
pnpm --filter @brandkit/brand-engine test
```
