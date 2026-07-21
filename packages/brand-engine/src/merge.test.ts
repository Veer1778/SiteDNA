import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { readCrawlArtifactFromDir } from "@brandkit/crawler";
import type { ClassifiedAsset, ExtractionResult } from "@brandkit/extractor";
import { BrandJsonSchema, DesignLanguageLabelSchema } from "@brandkit/shared";
import type { VisionClassification } from "@brandkit/vision";
import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { mergeBrandJson } from "./merge.js";
import { makeBrandJson } from "./test-utils.js";

const fixtureDir = fileURLToPath(new URL("../examples/fixtures/basic-site/", import.meta.url));

async function readJson<T>(name: string): Promise<T> {
  return JSON.parse(await readFile(new URL(name, `file://${fixtureDir}`), "utf-8")) as T;
}

describe("mergeBrandJson (golden file, recorded fixture)", () => {
  it("reproduces the committed expected BrandKitResult exactly", async () => {
    const crawlArtifact = await readCrawlArtifactFromDir(`${fixtureDir}crawl-artifact`);
    const extraction = await readJson<ExtractionResult>("extraction.json");
    const vision = await readJson<VisionClassification>("vision-classification.json");
    const expected = await readJson<unknown>("expected-brand-kit-result.json");

    const result = mergeBrandJson({ crawlArtifact, extraction, vision });

    // The screenshots aren't part of the committed JSON (see writeCrawlArtifactToDir); the
    // merge result never includes them either, so a plain JSON round-trip comparison is exact.
    expect(JSON.parse(JSON.stringify(result))).toEqual(expected);
  });

  it("scores the recorded fixture's completeness below 1 (missing components/success/warning/danger)", async () => {
    const crawlArtifact = await readCrawlArtifactFromDir(`${fixtureDir}crawl-artifact`);
    const extraction = await readJson<ExtractionResult>("extraction.json");
    const vision = await readJson<VisionClassification>("vision-classification.json");

    const result = mergeBrandJson({ crawlArtifact, extraction, vision });
    expect(result.completeness.score).toBeLessThan(1);
    expect(result.completeness.score).toBeGreaterThan(0);
  });
});

// --- Property test -------------------------------------------------------------------------

const arbHexColor = fc
  .integer({ min: 0, max: 0xffffff })
  .map((n) => `#${n.toString(16).padStart(6, "0")}`);
const arbConfidence = fc.float({ min: 0, max: 1, noNaN: true });
const arbColorValue = fc.record({ hex: arbHexColor, confidence: arbConfidence });
const arbOptionalColorValue = fc.option(arbColorValue, { nil: undefined });

const arbColorRoles = fc.record({
  primary: arbOptionalColorValue,
  secondary: arbOptionalColorValue,
  accent: arbOptionalColorValue,
  surface: arbOptionalColorValue,
  background: arbOptionalColorValue,
  text: arbOptionalColorValue,
  border: arbOptionalColorValue,
  success: arbOptionalColorValue,
  warning: arbOptionalColorValue,
  danger: arbOptionalColorValue,
});

const ASSET_URLS = [
  "https://example.test/a.png",
  "https://example.test/b.svg",
  "https://example.test/c.jpg",
] as const;
const arbAssetClassification = fc.constantFrom(
  "icon" as const,
  "illustration" as const,
  "photo" as const,
  "other" as const,
);
const arbClassifiedAsset: fc.Arbitrary<ClassifiedAsset> = fc.record({
  url: fc.constantFrom(...ASSET_URLS),
  classification: arbAssetClassification,
  reason: fc.string(),
});

const arbShadow = fc.record({
  offsetX: fc.float({ noNaN: true, min: -50, max: 50 }),
  offsetY: fc.float({ noNaN: true, min: -50, max: 50 }),
  blur: fc.float({ noNaN: true, min: 0, max: 50 }),
  spread: fc.float({ noNaN: true, min: -50, max: 50 }),
  color: arbHexColor,
  inset: fc.boolean(),
});

const arbExtraction: fc.Arbitrary<ExtractionResult> = fc.record({
  colors: arbColorRoles,
  typography: fc.constant(makeBrandJson().typography),
  logo: fc.constant({}),
  spacing: fc.array(fc.float({ noNaN: true, min: 0, max: 200 }), { maxLength: 5 }),
  radius: fc.array(fc.float({ noNaN: true, min: 0, max: 100 }), { maxLength: 5 }),
  shadows: fc.array(arbShadow, { maxLength: 3 }),
  animations: fc.record({
    durations: fc.array(fc.float({ noNaN: true, min: 0, max: 2000 }), { maxLength: 3 }),
    easings: fc.array(fc.constantFrom("ease", "linear", "ease-in-out"), { maxLength: 3 }),
  }),
  assets: fc.array(arbClassifiedAsset, { maxLength: 4 }),
});

const arbVision: fc.Arbitrary<VisionClassification> = fc.record({
  styleClassification: fc.array(
    fc.record({
      label: fc.constantFrom(...DesignLanguageLabelSchema.options),
      score: arbConfidence,
    }),
    { maxLength: 3 },
  ),
  voice: fc.array(fc.string({ minLength: 1 }), { maxLength: 3 }),
  photographyStyle: fc.array(fc.string({ minLength: 1 }), { maxLength: 2 }),
  illustrationStyle: fc.array(fc.string({ minLength: 1 }), { maxLength: 2 }),
  spacingDensity: fc.constantFrom("compact" as const, "comfortable" as const, "spacious" as const),
  animationStyle: fc.array(fc.string({ minLength: 1 }), { maxLength: 2 }),
  assetRefinements: fc.array(
    fc.record({
      url: fc.constantFrom(...ASSET_URLS),
      suggestedClassification: arbAssetClassification,
      confidence: arbConfidence,
      reason: fc.string(),
    }),
    { maxLength: 4 },
  ),
  logoRefinement: fc.option(
    fc.record({
      suggestedLogoUrl: fc.constant("https://example.test/alt-logo.svg"),
      reason: fc.string(),
    }),
    { nil: null },
  ),
});

describe("mergeBrandJson (property test)", () => {
  it("always produces a BrandJson that validates against BrandJsonSchema", () => {
    const baseCrawlArtifact = {
      sourceUrl: "https://example.test/",
      finalUrl: "https://example.test/",
      redirectChain: ["https://example.test/"],
      crawledAt: new Date().toISOString(),
      html: "<html></html>",
      meta: { title: null, description: null },
      stylesheets: [],
      computedStyles: [],
      screenshotFullPage: Buffer.alloc(0),
      screenshotViewport: Buffer.alloc(0),
      assets: [],
      faviconCandidates: [],
    };

    fc.assert(
      fc.property(arbExtraction, arbVision, (extraction, vision) => {
        const result = mergeBrandJson({ crawlArtifact: baseCrawlArtifact, extraction, vision });
        expect(BrandJsonSchema.safeParse(result.brandJson).success).toBe(true);
      }),
      { numRuns: 200 },
    );
  });

  it("never throws, for any combination of extraction/vision inputs, including vision omitted", () => {
    const baseCrawlArtifact = {
      sourceUrl: "https://example.test/",
      finalUrl: "https://example.test/",
      redirectChain: ["https://example.test/"],
      crawledAt: new Date().toISOString(),
      html: "<html></html>",
      meta: { title: null, description: null },
      stylesheets: [],
      computedStyles: [],
      screenshotFullPage: Buffer.alloc(0),
      screenshotViewport: Buffer.alloc(0),
      assets: [],
      faviconCandidates: [],
    };

    fc.assert(
      fc.property(arbExtraction, fc.option(arbVision, { nil: undefined }), (extraction, vision) => {
        expect(() =>
          mergeBrandJson({
            crawlArtifact: baseCrawlArtifact,
            extraction,
            ...(vision ? { vision } : {}),
          }),
        ).not.toThrow();
      }),
      { numRuns: 200 },
    );
  });
});
