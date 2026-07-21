import { SCHEMA_VERSION, type BrandJson } from "@brandkit/shared";

/** A minimal-but-complete, fully-empty `BrandJson` for unit tests; override only what you need. */
export function makeBrandJson(overrides: Partial<BrandJson> = {}): BrandJson {
  return {
    schemaVersion: SCHEMA_VERSION,
    sourceUrl: "https://example.test/",
    extractedAt: new Date().toISOString(),
    logo: {},
    colors: {},
    typography: {
      heading: {
        families: ["sans-serif"],
        weights: [400],
        sizes: [16],
        letterSpacing: [0],
        lineHeights: [1.5],
      },
      body: {
        families: ["sans-serif"],
        weights: [400],
        sizes: [16],
        letterSpacing: [0],
        lineHeights: [1.5],
      },
    },
    spacing: [],
    radius: [],
    shadows: [],
    animations: { durations: [], easings: [] },
    components: [],
    voice: [],
    styleClassification: [],
    ...overrides,
  };
}
