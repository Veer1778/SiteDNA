import { describe, expect, it } from "vitest";

import { buildPrompt, buildRetryPrompt } from "./prompt.js";

describe("buildPrompt", () => {
  it("includes the required JSON keys and design-language labels", () => {
    const prompt = buildPrompt({});
    expect(prompt).toContain("styleClassification");
    expect(prompt).toContain("spacingDensity");
    expect(prompt).toContain("stripe-like");
    expect(prompt).toContain("logoRefinement: null");
  });

  it("lists asset candidates when provided", () => {
    const prompt = buildPrompt({
      assetCandidates: [{ url: "https://example.test/a.png", currentClassification: "photo" }],
    });
    expect(prompt).toContain("https://example.test/a.png");
    expect(prompt).toContain("photo");
  });

  it("notes when no candidates are provided", () => {
    const prompt = buildPrompt({});
    expect(prompt).toContain("No asset candidates were provided");
    expect(prompt).toContain("No logo candidates were provided");
  });
});

describe("buildRetryPrompt", () => {
  it("includes the previous response and the validation error", () => {
    const prompt = buildRetryPrompt("not json", "Unexpected token");
    expect(prompt).toContain("not json");
    expect(prompt).toContain("Unexpected token");
  });
});
