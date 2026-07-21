import { describe, expect, it } from "vitest";

import { BLANK_COMPUTED_STYLE, makeArtifact } from "./test-utils.js";
import { extractTokens } from "./tokens.js";

describe("extractTokens", () => {
  it("derives spacing and radius from computed padding/margin/borderRadius", () => {
    const artifact = makeArtifact({
      computedStyles: [
        {
          selector: "button",
          styles: {
            ...BLANK_COMPUTED_STYLE,
            padding: "8px 16px",
            margin: "0px",
            borderRadius: "8px",
          },
        },
        {
          selector: "input",
          styles: {
            ...BLANK_COMPUTED_STYLE,
            padding: "8px 12px",
            margin: "4px",
            borderRadius: "4px",
          },
        },
      ],
    });

    const { spacing, radius } = extractTokens(artifact);
    expect(spacing).toEqual([0, 4, 8, 12, 16]);
    expect(radius).toEqual([4, 8]);
  });

  it("drops negative margins from the spacing scale (SpacingScaleSchema requires non-negative)", () => {
    const artifact = makeArtifact({
      computedStyles: [
        {
          selector: ".overlap",
          styles: { ...BLANK_COMPUTED_STYLE, padding: "8px", margin: "-24px" },
        },
      ],
    });

    const { spacing } = extractTokens(artifact);
    expect(spacing).toEqual([8]);
  });

  it("parses box-shadow from computed styles and dedupes identical shadows", () => {
    const artifact = makeArtifact({
      computedStyles: [
        {
          selector: "button",
          styles: { ...BLANK_COMPUTED_STYLE, boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px" },
        },
        {
          selector: "nav",
          styles: { ...BLANK_COMPUTED_STYLE, boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px" },
        },
        { selector: "input", styles: { ...BLANK_COMPUTED_STYLE, boxShadow: "none" } },
      ],
    });

    const { shadows } = extractTokens(artifact);
    expect(shadows).toHaveLength(1);
    expect(shadows[0]).toMatchObject({ offsetX: 0, offsetY: 1, blur: 2, spread: 0, inset: false });
  });

  it("parses inset shadows", () => {
    const artifact = makeArtifact({
      computedStyles: [
        {
          selector: "input",
          styles: {
            ...BLANK_COMPUTED_STYLE,
            boxShadow: "rgb(0, 0, 0) 0px 1px 2px 0px inset",
          },
        },
      ],
    });
    const { shadows } = extractTokens(artifact);
    expect(shadows[0]?.inset).toBe(true);
  });

  it("derives animation durations and easings from stylesheet transition declarations", () => {
    const artifact = makeArtifact({
      stylesheets: [
        {
          href: null,
          content: `
            button { transition: background-color 200ms ease-in-out; }
            .fade { animation-duration: 0.3s; animation-timing-function: linear; }
          `,
        },
      ],
    });

    const { animations } = extractTokens(artifact);
    expect(animations.durations).toEqual(expect.arrayContaining([200, 300]));
    expect(animations.easings).toEqual(expect.arrayContaining(["ease-in-out", "linear"]));
  });

  it("drops a negative delay token from the transition shorthand out of durations (AnimationsSchema requires non-negative)", () => {
    const artifact = makeArtifact({
      stylesheets: [
        {
          href: null,
          content: `.reveal { transition: opacity 300ms ease -100ms; }`,
        },
      ],
    });

    const { animations } = extractTokens(artifact);
    expect(animations.durations).toEqual([300]);
  });

  it("skips unparseable stylesheets without throwing, and logs a warning", () => {
    const events: string[] = [];
    const artifact = makeArtifact({
      stylesheets: [{ href: null, content: "button {{{ not css" }],
    });

    expect(() =>
      extractTokens(artifact, { onLog: (event) => events.push(event.step) }),
    ).not.toThrow();
  });
});
