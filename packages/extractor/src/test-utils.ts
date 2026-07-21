import type { ComputedStyleProperties, CrawlArtifact } from "@brandkit/crawler";

export const BLANK_COMPUTED_STYLE: ComputedStyleProperties = {
  color: "rgb(0, 0, 0)",
  backgroundColor: "rgba(0, 0, 0, 0)",
  fontFamily: "sans-serif",
  fontSize: "16px",
  fontWeight: "400",
  lineHeight: "normal",
  letterSpacing: "normal",
  borderRadius: "0px",
  boxShadow: "none",
  border: "0px none rgb(0, 0, 0)",
  borderColor: "rgb(0, 0, 0)",
  padding: "0px",
  margin: "0px",
};

/** A minimal-but-complete `CrawlArtifact` for unit tests; override only the fields you need. */
export function makeArtifact(overrides: Partial<CrawlArtifact> = {}): CrawlArtifact {
  return {
    sourceUrl: "http://example.test/",
    finalUrl: "http://example.test/",
    redirectChain: ["http://example.test/"],
    crawledAt: new Date().toISOString(),
    html: "<!doctype html><html><head></head><body></body></html>",
    meta: { title: null, description: null },
    stylesheets: [],
    computedStyles: [],
    screenshotFullPage: Buffer.alloc(0),
    screenshotViewport: Buffer.alloc(0),
    assets: [],
    faviconCandidates: [],
    ...overrides,
  };
}
