import { describe, expect, it } from "vitest";

import type { VisionClassification } from "../schema.js";
import { FakeVisionProvider } from "./fake.js";

const RESPONSE: VisionClassification = {
  styleClassification: [{ label: "minimal", score: 0.8 }],
  voice: ["calm"],
  photographyStyle: [],
  illustrationStyle: [],
  spacingDensity: "spacious",
  animationStyle: [],
  assetRefinements: [],
  logoRefinement: null,
};

describe("FakeVisionProvider", () => {
  it("always returns the configured response, regardless of input", async () => {
    const provider = new FakeVisionProvider(RESPONSE);

    const result1 = await provider.classify({ images: [] });
    const result2 = await provider.classify({
      images: [],
      assetCandidates: [{ url: "https://example.test/a.png", currentClassification: "photo" }],
    });

    expect(result1).toEqual(RESPONSE);
    expect(result2).toEqual(RESPONSE);
  });
});
