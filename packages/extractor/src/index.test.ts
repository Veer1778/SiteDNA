import { readCrawlArtifactFromDir } from "@brandkit/crawler";
import {
  AnimationsSchema,
  ColorRolesSchema,
  LogoSchema,
  RadiusScaleSchema,
  ShadowsSchema,
  SpacingScaleSchema,
  TypographySchema,
} from "@brandkit/shared";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { ClassifiedAssetSchema } from "./schema.js";
import { extractAll, PACKAGE_NAME } from "./index.js";

const fixtureDir = fileURLToPath(
  new URL("../examples/fixtures/crawl-artifacts/basic-site/", import.meta.url),
);

describe("@brandkit/extractor", () => {
  it("exposes its package identity", () => {
    expect(PACKAGE_NAME).toBe("@brandkit/extractor");
  });
});

describe("extractAll (end-to-end, recorded fixture artifact)", () => {
  it("produces output where every piece validates against its schema", async () => {
    const artifact = await readCrawlArtifactFromDir(fixtureDir);
    const events: string[] = [];

    const result = await extractAll(artifact, {
      onLog: (event) => events.push(`${event.step}: ${event.message}`),
      fetchBytes: async (url) => {
        // The fixture's logo/favicon both point at logo.svg, already embedded in the recorded
        // stylesheet-free HTML — fetch it straight from the fixture site's source files instead
        // of the network, which no longer exists once the recording server has shut down.
        if (url.endsWith("/logo.svg")) {
          const { readFile } = await import("node:fs/promises");
          const path = fileURLToPath(
            new URL("../../crawler/examples/fixtures/sites/basic/logo.svg", import.meta.url),
          );
          return readFile(path);
        }
        return null;
      },
    });

    expect(() => ColorRolesSchema.parse(result.colors)).not.toThrow();
    expect(() => TypographySchema.parse(result.typography)).not.toThrow();
    expect(() => LogoSchema.parse(result.logo)).not.toThrow();
    expect(() => SpacingScaleSchema.parse(result.spacing)).not.toThrow();
    expect(() => RadiusScaleSchema.parse(result.radius)).not.toThrow();
    expect(() => ShadowsSchema.parse(result.shadows)).not.toThrow();
    expect(() => AnimationsSchema.parse(result.animations)).not.toThrow();
    for (const asset of result.assets) {
      expect(() => ClassifiedAssetSchema.parse(asset)).not.toThrow();
    }

    // Sanity-check a few concrete values, not just schema-validity.
    expect(result.colors.background?.hex).toBe("#ffffff");
    expect(result.colors.text?.hex).toBe("#111827");
    expect(result.typography.heading.sizes).toContain(32);
    expect(result.spacing.length).toBeGreaterThan(0);
    expect(result.radius.length).toBeGreaterThan(0);
    expect(result.shadows.length).toBeGreaterThan(0);
    expect(events.length).toBeGreaterThan(0);
  });
});
