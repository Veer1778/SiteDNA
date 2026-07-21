# @brandkit/vision

Provider-agnostic Vision AI interface (`VisionProvider`) that classifies a site's visual
identity from screenshots: design language (multi-label), brand voice, photography/illustration
style, spacing density, and animation style — plus refinement suggestions for Phase 2's asset
classifications and logo ranking. One concrete implementation, `AnthropicVisionProvider`. See
[Claude.md](../../Claude.md) and [ARCHITECTURE.md](../../ARCHITECTURE.md).

## Usage

```ts
import { crawlUrl } from "@brandkit/crawler";
import { AnthropicVisionProvider, classifyFromCrawlArtifact } from "@brandkit/vision";

const artifact = await crawlUrl("https://example.com");
const provider = new AnthropicVisionProvider(); // reads ANTHROPIC_API_KEY / VISION_MODEL from env

const result = await classifyFromCrawlArtifact(artifact, provider, {
  onLog: (event) => console.log(event),
});
```

For tests or anywhere you don't want a real API call, use `FakeVisionProvider` instead:

```ts
import { FakeVisionProvider } from "@brandkit/vision";

const provider = new FakeVisionProvider({
  styleClassification: [{ label: "modern", score: 0.8 }],
  voice: ["confident"],
  photographyStyle: [],
  illustrationStyle: [],
  spacingDensity: "comfortable",
  animationStyle: [],
  assetRefinements: [],
  logoRefinement: null,
});
```

## Environment

See `.env.example`: `ANTHROPIC_API_KEY` (only read when `AnthropicVisionProvider` actually makes
a request — importing this package or using `FakeVisionProvider` never needs a key) and
`VISION_MODEL` (optional, defaults to a current Claude model).

## What's a Brand JSON field, what isn't

`styleClassification` and `voice` map directly onto `packages/shared`'s `BrandJsonSchema`
fields. `photographyStyle`, `illustrationStyle`, `spacingDensity`, `animationStyle`, and the
asset/logo refinement suggestions have no Brand JSON field of their own — they're consumed by
`packages/brand-engine`'s merge pipeline in Phase 4, the same way Phase 2's `ClassifiedAsset` is.
Vision only _suggests_ corrections to Phase 2's asset classifications/logo ranking; applying them
(e.g. above a confidence threshold) is `brand-engine`'s job, not this package's.

## Reliability

- **Structured JSON only**: prompts (`src/prompt.ts`) demand a single JSON object, no prose.
- **Schema-validated with one retry**: `AnthropicVisionProvider` validates every response against
  `VisionClassificationSchema`; on failure it retries once with a corrective prompt including the
  validation error, then throws `VisionResponseValidationError` if the retry also fails.
- **Cost guard**: `src/prepare-images.ts` caps images per request (default 3) and downscales each
  to a max dimension (default 1024px longest side, re-encoded as JPEG) before any provider sees
  them.
- **Testable without a live API call**: `AnthropicVisionProvider` accepts an injectable `client`
  (same shape as `@anthropic-ai/sdk`'s `Anthropic`); every test in this package injects a fake
  one. `FakeVisionProvider` is available for downstream packages' tests too.

## Logging

Every function/provider takes an optional `onLog` callback (`VisionLogEvent = { level, step,
message, meta? }`, `src/log.ts`), same shape as `packages/crawler`/`packages/extractor`'s
loggers. Defaults to a no-op.

## Fixtures

`examples/fixtures/vision-responses/` has one valid recorded response and several invalid
variants (bad label, missing field, out-of-range confidence, non-JSON text) used by the
schema-validation and retry tests.

## Build/test in isolation

```sh
pnpm --filter @brandkit/vision build
pnpm --filter @brandkit/vision test
```
