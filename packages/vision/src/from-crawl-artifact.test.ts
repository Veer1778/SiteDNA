import type { CrawlArtifact } from "@brandkit/crawler";
import { describe, expect, it } from "vitest";

import { classifyFromCrawlArtifact } from "./from-crawl-artifact.js";
import type { VisionInput } from "./provider.js";
import { FakeVisionProvider } from "./providers/fake.js";
import type { VisionClassification } from "./schema.js";

function makeArtifact(): CrawlArtifact {
  return {
    sourceUrl: "https://example.test/",
    finalUrl: "https://example.test/",
    redirectChain: ["https://example.test/"],
    crawledAt: new Date().toISOString(),
    html: "<html></html>",
    meta: { title: null, description: null },
    stylesheets: [],
    computedStyles: [],
    screenshotFullPage: Buffer.from("full-page"),
    screenshotViewport: Buffer.from("viewport"),
    assets: [],
    faviconCandidates: [],
  };
}

const RESPONSE: VisionClassification = {
  styleClassification: [{ label: "modern", score: 0.7 }],
  voice: ["confident"],
  photographyStyle: [],
  illustrationStyle: [],
  spacingDensity: "comfortable",
  animationStyle: [],
  assetRefinements: [],
  logoRefinement: null,
};

describe("classifyFromCrawlArtifact", () => {
  it("feeds the artifact's screenshots to the provider and returns its classification", async () => {
    let capturedInput: VisionInput | null = null;
    const provider = new FakeVisionProvider(RESPONSE);
    const originalClassify = provider.classify.bind(provider);
    provider.classify = async (input: VisionInput) => {
      capturedInput = input;
      return originalClassify(input);
    };

    const result = await classifyFromCrawlArtifact(makeArtifact(), provider);

    expect(result).toEqual(RESPONSE);
    const input = capturedInput as VisionInput | null;
    expect(input?.images).toHaveLength(2);
    expect(input?.images.map((i) => i.label)).toEqual([
      "full-page screenshot",
      "viewport screenshot",
    ]);
  });

  it("passes through asset/logo candidates when provided", async () => {
    let capturedInput: VisionInput | null = null;
    const provider = new FakeVisionProvider(RESPONSE);
    provider.classify = async (input: VisionInput) => {
      capturedInput = input;
      return RESPONSE;
    };

    await classifyFromCrawlArtifact(makeArtifact(), provider, {
      assetCandidates: [{ url: "https://example.test/a.png", currentClassification: "photo" }],
      logoCandidates: [{ url: "https://example.test/logo.svg", score: 5 }],
    });

    const input = capturedInput as VisionInput | null;
    expect(input?.assetCandidates).toHaveLength(1);
    expect(input?.logoCandidates).toHaveLength(1);
  });

  it("logs the classification steps", async () => {
    const events: string[] = [];
    const provider = new FakeVisionProvider(RESPONSE);

    await classifyFromCrawlArtifact(makeArtifact(), provider, {
      onLog: (event) => events.push(event.step),
    });

    expect(events).toContain("from-crawl-artifact");
  });
});
