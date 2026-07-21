import type { ClassifiedAsset } from "@brandkit/extractor";
import type { AssetRefinement } from "@brandkit/vision";
import { describe, expect, it } from "vitest";

import { refineAssets } from "./refine-assets.js";

const baseAsset: ClassifiedAsset = {
  url: "https://example.test/hero.jpg",
  classification: "illustration",
  reason: "color-complexity",
};

describe("refineAssets", () => {
  it("applies a vision refinement above the confidence threshold", () => {
    const refinement: AssetRefinement = {
      url: baseAsset.url,
      suggestedClassification: "photo",
      confidence: 0.9,
      reason: "high-detail candid photography",
    };

    const [result] = refineAssets([baseAsset], [refinement]);
    expect(result?.classification).toBe("photo");
    expect(result?.reason).toContain("vision override");
    expect(result?.reason).toContain("illustration");
  });

  it("ignores a vision refinement below the confidence threshold", () => {
    const refinement: AssetRefinement = {
      url: baseAsset.url,
      suggestedClassification: "photo",
      confidence: 0.5,
      reason: "uncertain",
    };

    const [result] = refineAssets([baseAsset], [refinement]);
    expect(result).toEqual(baseAsset);
  });

  it("leaves an asset unchanged when vision agrees", () => {
    const refinement: AssetRefinement = {
      url: baseAsset.url,
      suggestedClassification: "illustration",
      confidence: 0.95,
      reason: "agrees",
    };

    const [result] = refineAssets([baseAsset], [refinement]);
    expect(result).toEqual(baseAsset);
  });

  it("leaves an asset unchanged when there is no matching refinement", () => {
    const [result] = refineAssets([baseAsset], []);
    expect(result).toEqual(baseAsset);
  });

  it("respects a custom confidence threshold", () => {
    const refinement: AssetRefinement = {
      url: baseAsset.url,
      suggestedClassification: "photo",
      confidence: 0.6,
      reason: "moderately confident",
    };

    const [belowCustom] = refineAssets([baseAsset], [refinement], { confidenceThreshold: 0.8 });
    expect(belowCustom?.classification).toBe("illustration");

    const [aboveCustom] = refineAssets([baseAsset], [refinement], { confidenceThreshold: 0.5 });
    expect(aboveCustom?.classification).toBe("photo");
  });

  it("logs applied and skipped refinements", () => {
    const events: string[] = [];
    const applied: AssetRefinement = {
      url: "https://example.test/a.png",
      suggestedClassification: "photo",
      confidence: 0.9,
      reason: "x",
    };
    const skipped: AssetRefinement = {
      url: "https://example.test/b.png",
      suggestedClassification: "photo",
      confidence: 0.1,
      reason: "y",
    };
    const assets: ClassifiedAsset[] = [
      { url: "https://example.test/a.png", classification: "illustration", reason: "r" },
      { url: "https://example.test/b.png", classification: "illustration", reason: "r" },
    ];

    refineAssets(assets, [applied, skipped], { onLog: (e) => events.push(e.step) });

    expect(events).toContain("asset-refinement-applied");
    expect(events).toContain("asset-refinement-skipped");
  });
});
