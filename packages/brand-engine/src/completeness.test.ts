import { describe, expect, it } from "vitest";

import { computeCompleteness } from "./completeness.js";
import { makeBrandJson } from "./test-utils.js";

describe("computeCompleteness", () => {
  it("scores an entirely empty Brand JSON low and reports every gap", () => {
    const report = computeCompleteness(makeBrandJson());

    expect(report.score).toBeLessThan(0.2);
    expect(report.gaps.some((g) => g.field === "colors.primary")).toBe(true);
    expect(report.gaps.some((g) => g.field === "components")).toBe(true);
    expect(report.gaps.some((g) => g.field === "voice")).toBe(true);
  });

  it("always flags components as missing, since no phase implements detection", () => {
    const report = computeCompleteness(makeBrandJson({ components: [] }));
    const gap = report.gaps.find((g) => g.field === "components");
    expect(gap?.severity).toBe("missing");
  });

  it("gives full credit for a high-confidence color and flags a low-confidence one", () => {
    const report = computeCompleteness(
      makeBrandJson({
        colors: {
          primary: { hex: "#1a56db", confidence: 0.95 },
          secondary: { hex: "#7e3af2", confidence: 0.3 },
        },
      }),
    );

    expect(report.gaps.some((g) => g.field === "colors.primary")).toBe(false);
    const secondaryGap = report.gaps.find((g) => g.field === "colors.secondary");
    expect(secondaryGap?.severity).toBe("low-confidence");
  });

  it("scores a fully-populated Brand JSON at 1", () => {
    const fullColors = {
      primary: { hex: "#1a56db", confidence: 0.9 },
      secondary: { hex: "#7e3af2", confidence: 0.9 },
      accent: { hex: "#0e9f6e", confidence: 0.9 },
      surface: { hex: "#f9fafb", confidence: 0.9 },
      background: { hex: "#ffffff", confidence: 0.9 },
      text: { hex: "#111827", confidence: 0.9 },
      border: { hex: "#e5e7eb", confidence: 0.9 },
      success: { hex: "#0e9f6e", confidence: 0.9 },
      warning: { hex: "#c27803", confidence: 0.9 },
      danger: { hex: "#e02424", confidence: 0.9 },
    };
    const report = computeCompleteness(
      makeBrandJson({
        colors: fullColors,
        logo: {
          light: { url: "https://example.test/l.svg", width: 1, height: 1, format: "svg" },
          dark: { url: "https://example.test/d.svg", width: 1, height: 1, format: "svg" },
          favicon: { url: "https://example.test/f.svg", width: 1, height: 1, format: "svg" },
        },
        spacing: [4, 8],
        radius: [4],
        shadows: [{ offsetX: 0, offsetY: 1, blur: 2, spread: 0, color: "#000000", inset: false }],
        animations: { durations: [200], easings: ["ease"] },
        components: [
          {
            type: "button",
            screenshotRef: "x.png",
            boundingBox: { x: 0, y: 0, width: 1, height: 1 },
          },
        ],
        voice: ["confident"],
        styleClassification: [{ label: "modern", score: 0.8 }],
      }),
    );

    expect(report.score).toBe(1);
    expect(report.gaps).toEqual([]);
  });
});
