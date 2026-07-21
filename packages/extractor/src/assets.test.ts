import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { classifyAssets } from "./assets.js";
import { makeArtifact } from "./test-utils.js";

async function flatImageBuffer(): Promise<Buffer> {
  return sharp({
    create: { width: 64, height: 64, channels: 3, background: { r: 120, g: 120, b: 120 } },
  })
    .png()
    .toBuffer();
}

async function noiseImageBuffer(): Promise<Buffer> {
  const width = 64;
  const height = 64;
  const raw = Buffer.alloc(width * height * 3);
  for (let i = 0; i < raw.length; i++) raw[i] = Math.floor(Math.random() * 256);
  return sharp(raw, { raw: { width, height, channels: 3 } })
    .png()
    .toBuffer();
}

describe("classifyAssets", () => {
  it("classifies crawler-flagged icons without fetching", async () => {
    let fetchCount = 0;
    const artifact = makeArtifact({
      assets: [
        {
          url: "https://example.test/favicon.ico",
          kind: "icon",
          contentType: null,
          width: null,
          height: null,
        },
      ],
    });

    const result = await classifyAssets(artifact, {
      fetchBytes: async () => {
        fetchCount += 1;
        return null;
      },
    });

    expect(result).toEqual([
      {
        url: "https://example.test/favicon.ico",
        classification: "icon",
        reason: "crawler-flagged-icon",
      },
    ]);
    expect(fetchCount).toBe(0);
  });

  it("classifies small-dimension images as icons without fetching", async () => {
    const artifact = makeArtifact({
      assets: [
        {
          url: "https://example.test/badge.png",
          kind: "image",
          contentType: "image/png",
          width: 32,
          height: 32,
        },
      ],
    });

    const result = await classifyAssets(artifact, { fetchBytes: async () => null });
    expect(result[0]).toMatchObject({ classification: "icon", reason: "small-dimensions" });
  });

  it("classifies undersized SVGs as illustrations by default without fetching", async () => {
    const artifact = makeArtifact({
      assets: [
        {
          url: "https://example.test/logo.svg",
          kind: "image",
          contentType: "image/svg+xml",
          width: null,
          height: null,
        },
      ],
    });

    const result = await classifyAssets(artifact, { fetchBytes: async () => null });
    expect(result[0]).toMatchObject({ classification: "illustration", reason: "svg-default" });
  });

  it("classifies a high-color-complexity raster image as a photo", async () => {
    const noise = await noiseImageBuffer();
    const artifact = makeArtifact({
      assets: [
        {
          url: "https://example.test/hero.jpg",
          kind: "image",
          contentType: "image/jpeg",
          width: 800,
          height: 600,
        },
      ],
    });

    const result = await classifyAssets(artifact, { fetchBytes: async () => noise });
    expect(result[0]).toMatchObject({ classification: "photo", reason: "color-complexity" });
  });

  it("classifies a flat-color raster image as an illustration", async () => {
    const flat = await flatImageBuffer();
    const artifact = makeArtifact({
      assets: [
        {
          url: "https://example.test/graphic.png",
          kind: "image",
          contentType: "image/png",
          width: 800,
          height: 600,
        },
      ],
    });

    const result = await classifyAssets(artifact, { fetchBytes: async () => flat });
    expect(result[0]).toMatchObject({ classification: "illustration", reason: "color-complexity" });
  });

  it("excludes non-image assets (fonts) from the output", async () => {
    const artifact = makeArtifact({
      assets: [
        {
          url: "https://example.test/font.woff2",
          kind: "font",
          contentType: "font/woff2",
          width: null,
          height: null,
        },
      ],
    });

    const result = await classifyAssets(artifact, { fetchBytes: async () => null });
    expect(result).toEqual([]);
  });

  it("marks assets as 'other' when the fetch fails, and logs a warning", async () => {
    const events: string[] = [];
    const artifact = makeArtifact({
      assets: [
        {
          url: "https://example.test/broken.png",
          kind: "image",
          contentType: null,
          width: 800,
          height: 600,
        },
      ],
    });

    const result = await classifyAssets(artifact, {
      fetchBytes: async () => null,
      onLog: (event) => events.push(event.level),
    });

    expect(result[0]).toMatchObject({ classification: "other", reason: "fetch-or-decode-failed" });
    expect(events).toContain("warn");
  });

  it("caps the number of raster assets sampled for color complexity", async () => {
    const flat = await flatImageBuffer();
    let fetchCount = 0;
    const assets = Array.from({ length: 25 }, (_, i) => ({
      url: `https://example.test/img-${i}.png`,
      kind: "image" as const,
      contentType: "image/png",
      width: 800,
      height: 600,
    }));
    const artifact = makeArtifact({ assets });

    const result = await classifyAssets(artifact, {
      fetchBytes: async () => {
        fetchCount += 1;
        return flat;
      },
    });

    expect(fetchCount).toBeLessThanOrEqual(20);
    expect(result.some((r) => r.reason === "sample-cap-reached")).toBe(true);
  });
});
