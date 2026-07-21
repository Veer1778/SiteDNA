import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import type { CrawlArtifact } from "./schema.js";
import { CrawlArtifactSchema } from "./schema.js";

const FULL_PAGE_SCREENSHOT_FILE = "screenshot-full.png";
const VIEWPORT_SCREENSHOT_FILE = "screenshot-viewport.png";
const MANIFEST_FILE = "artifact.json";

/**
 * Writes a {@link CrawlArtifact} to `dir` as `artifact.json` (everything except the two
 * screenshots, which are written as sibling PNG files and referenced by relative path) — keeps
 * the JSON diffable instead of base64-bloated, mirroring `components[].screenshotRef` in Brand
 * JSON. Round-trips with {@link readCrawlArtifactFromDir}.
 */
export async function writeCrawlArtifactToDir(artifact: CrawlArtifact, dir: string): Promise<void> {
  await mkdir(dir, { recursive: true });
  const { screenshotFullPage, screenshotViewport, ...rest } = artifact;
  await Promise.all([
    writeFile(join(dir, FULL_PAGE_SCREENSHOT_FILE), screenshotFullPage),
    writeFile(join(dir, VIEWPORT_SCREENSHOT_FILE), screenshotViewport),
    writeFile(
      join(dir, MANIFEST_FILE),
      JSON.stringify(
        {
          ...rest,
          screenshotFullPage: FULL_PAGE_SCREENSHOT_FILE,
          screenshotViewport: VIEWPORT_SCREENSHOT_FILE,
        },
        null,
        2,
      ),
    ),
  ]);
}

/** Reads back a directory written by {@link writeCrawlArtifactToDir}, validating the result. */
export async function readCrawlArtifactFromDir(dir: string): Promise<CrawlArtifact> {
  const manifest = JSON.parse(await readFile(join(dir, MANIFEST_FILE), "utf-8")) as Record<
    string,
    unknown
  >;
  const [screenshotFullPage, screenshotViewport] = await Promise.all([
    readFile(join(dir, FULL_PAGE_SCREENSHOT_FILE)),
    readFile(join(dir, VIEWPORT_SCREENSHOT_FILE)),
  ]);
  return CrawlArtifactSchema.parse({
    ...manifest,
    screenshotFullPage,
    screenshotViewport,
  });
}
