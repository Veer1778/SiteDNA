import sharp from "sharp";
import { describe, expect, it } from "vitest";

import type { Palette } from "./colors.js";
import { extractColors } from "./colors.js";
import { BLANK_COMPUTED_STYLE, makeArtifact } from "./test-utils.js";

const FAKE_PALETTE: Palette = {
  Vibrant: { hex: "#1a56db", population: 500 },
  DarkVibrant: { hex: "#0e3a9e", population: 300 },
  LightVibrant: { hex: "#7ea6f0", population: 200 },
  Muted: { hex: "#8899aa", population: 150 },
  DarkMuted: { hex: "#334455", population: 100 },
  LightMuted: { hex: "#f9fafb", population: 400 },
};

describe("extractColors", () => {
  it("takes background/text from computed html/body styles with high confidence", async () => {
    const artifact = makeArtifact({
      computedStyles: [
        {
          selector: "body",
          styles: {
            ...BLANK_COMPUTED_STYLE,
            backgroundColor: "rgb(255, 255, 255)",
            color: "rgb(17, 24, 39)",
          },
        },
      ],
    });

    const roles = await extractColors(artifact, { getPalette: async () => FAKE_PALETTE });

    expect(roles.background).toEqual({ hex: "#ffffff", confidence: 0.95 });
    expect(roles.text).toEqual({ hex: "#111827", confidence: 0.9 });
  });

  it("prefers button background color for primary over the palette", async () => {
    const artifact = makeArtifact({
      computedStyles: [
        {
          selector: "body",
          styles: { ...BLANK_COMPUTED_STYLE, backgroundColor: "rgb(255, 255, 255)" },
        },
        {
          selector: "button",
          styles: { ...BLANK_COMPUTED_STYLE, backgroundColor: "rgb(26, 86, 219)" },
        },
      ],
    });

    const roles = await extractColors(artifact, { getPalette: async () => FAKE_PALETTE });

    expect(roles.primary?.hex).toBe("#1a56db");
    expect(roles.primary?.confidence).toBeGreaterThanOrEqual(0.85);
  });

  it("falls back to the palette when there is no CSS signal for primary", async () => {
    const artifact = makeArtifact({ computedStyles: [] });
    const roles = await extractColors(artifact, { getPalette: async () => FAKE_PALETTE });

    expect(roles.primary?.hex).toBe("#1a56db"); // highest-population non-neutral swatch
    expect(roles.primary?.confidence).toBeLessThan(0.85);
  });

  it("never sets success/warning/danger (no reliable signal)", async () => {
    const artifact = makeArtifact({ computedStyles: [] });
    const roles = await extractColors(artifact, { getPalette: async () => FAKE_PALETTE });

    expect(roles.success).toBeUndefined();
    expect(roles.warning).toBeUndefined();
    expect(roles.danger).toBeUndefined();
  });

  it("continues with CSS-only signals if palette extraction throws", async () => {
    const artifact = makeArtifact({
      computedStyles: [
        {
          selector: "body",
          styles: { ...BLANK_COMPUTED_STYLE, backgroundColor: "rgb(255, 255, 255)" },
        },
      ],
    });

    const roles = await extractColors(artifact, {
      getPalette: async () => {
        throw new Error("boom");
      },
    });

    expect(roles.background?.hex).toBe("#ffffff");
  });

  it("works end-to-end against a real screenshot via the default node-vibrant palette", async () => {
    const screenshot = await sharp({
      create: { width: 8, height: 8, channels: 3, background: { r: 26, g: 86, b: 219 } },
    })
      .png()
      .toBuffer();

    const artifact = makeArtifact({ screenshotFullPage: screenshot });
    const roles = await extractColors(artifact);

    expect(roles.primary ?? roles.background).toBeDefined();
  });
});
