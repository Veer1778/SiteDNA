import { describe, expect, it } from "vitest";

import { BLANK_COMPUTED_STYLE, makeArtifact } from "./test-utils.js";
import { extractTypography } from "./typography.js";

describe("extractTypography", () => {
  it("builds heading and body scales from computed styles", () => {
    const artifact = makeArtifact({
      computedStyles: [
        {
          selector: "h1",
          styles: {
            ...BLANK_COMPUTED_STYLE,
            fontFamily: '"Inter", system-ui, sans-serif',
            fontSize: "32px",
            fontWeight: "700",
            lineHeight: "38.4px",
            letterSpacing: "-0.5px",
          },
        },
        {
          selector: "h2",
          styles: {
            ...BLANK_COMPUTED_STYLE,
            fontFamily: '"Inter", system-ui, sans-serif',
            fontSize: "24px",
            fontWeight: "600",
            lineHeight: "28.8px",
            letterSpacing: "normal",
          },
        },
        {
          selector: "p",
          styles: {
            ...BLANK_COMPUTED_STYLE,
            fontFamily: "system-ui, sans-serif",
            fontSize: "16px",
            fontWeight: "400",
            lineHeight: "24px",
            letterSpacing: "normal",
          },
        },
        { selector: "body", styles: null },
      ],
    });

    const typography = extractTypography(artifact);

    expect(typography.heading.families).toEqual(["Inter", "system-ui", "sans-serif"]);
    expect(typography.heading.weights).toEqual([700, 600]);
    expect(typography.heading.sizes).toEqual([32, 24]);
    expect(typography.heading.letterSpacing).toContain(-0.5);
    expect(typography.heading.lineHeights).toEqual([1.2]);

    expect(typography.body.families).toEqual(["system-ui", "sans-serif"]);
    expect(typography.body.sizes).toEqual([16]);
    expect(typography.body.lineHeights).toEqual([1.5]);
  });

  it("falls back to a system-font default when a group has no usable samples", () => {
    const artifact = makeArtifact({ computedStyles: [] });
    const typography = extractTypography(artifact);

    expect(typography.heading.families).toEqual(["system-ui", "sans-serif"]);
    expect(typography.body.families).toEqual(["system-ui", "sans-serif"]);
  });

  it("logs when a fallback kicks in", () => {
    const events: string[] = [];
    extractTypography(makeArtifact({ computedStyles: [] }), {
      onLog: (event) => events.push(event.step),
    });
    expect(events).toContain("typography-fallback");
  });
});
