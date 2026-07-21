#!/usr/bin/env tsx
/**
 * Regenerates examples/fixtures/basic-site/ by crawling packages/crawler's local static
 * fixture site (never a live site), running the real extractor against it, constructing a
 * fixed-but-realistic VisionClassification (referencing the actual asset URLs discovered, so
 * refine-assets has something real to match against), and running the real merge pipeline —
 * the merged result becomes the golden file. Not run in CI — a one-off/occasional tool for
 * keeping the recorded fixture in sync with the source site and pipeline.
 *
 * Usage: pnpm --filter @brandkit/brand-engine record-fixture
 */
import { createReadStream } from "node:fs";
import { mkdir, stat, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { crawlUrl, writeCrawlArtifactToDir } from "@brandkit/crawler";
import { defaultFetchBytes, extractAll } from "@brandkit/extractor";
import type { VisionClassification } from "@brandkit/vision";

import { mergeBrandJson } from "../src/merge.js";

const fixtureSiteRoot = fileURLToPath(
  new URL("../../crawler/examples/fixtures/sites/basic/", import.meta.url),
);
const outDir = fileURLToPath(new URL("../examples/fixtures/basic-site/", import.meta.url));

const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html",
  ".css": "text/css",
  ".svg": "image/svg+xml",
};

async function main() {
  const server = createServer((req, res) => {
    const path = req.url === "/" ? "/index.html" : (req.url ?? "/index.html");
    const filePath = join(fixtureSiteRoot, path);
    if (!filePath.startsWith(fixtureSiteRoot)) {
      res.writeHead(403).end();
      return;
    }
    stat(filePath)
      .then((stats) => {
        if (!stats.isFile()) throw new Error("not a file");
        res.writeHead(200, {
          "Content-Type": CONTENT_TYPES[extname(filePath)] ?? "application/octet-stream",
        });
        createReadStream(filePath).pipe(res);
      })
      .catch(() => res.writeHead(404).end());
  });

  const baseUrl = await new Promise<string>((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("expected a TCP address");
      resolve(`http://127.0.0.1:${address.port}`);
    });
  });

  const artifact = await crawlUrl(`${baseUrl}/`, {
    allowPrivateNetwork: true,
    respectRobotsTxt: false,
    onLog: (e) => console.log(`[crawl:${e.level}] ${e.step}: ${e.message}`),
  });
  await mkdir(outDir, { recursive: true });
  await writeCrawlArtifactToDir(artifact, join(outDir, "crawl-artifact"));

  const extraction = await extractAll(artifact, {
    onLog: (e) => console.log(`[extract:${e.level}] ${e.step}: ${e.message}`),
    fetchBytes: (url) => defaultFetchBytes(url, { allowPrivateNetwork: true }),
  });
  await writeFile(join(outDir, "extraction.json"), JSON.stringify(extraction, null, 2));

  server.close();

  const firstAsset = extraction.assets[0];
  const vision: VisionClassification = {
    styleClassification: [
      { label: "modern", score: 0.82 },
      { label: "minimal", score: 0.64 },
    ],
    voice: ["confident", "friendly"],
    photographyStyle: [],
    illustrationStyle: ["flat", "geometric"],
    spacingDensity: "comfortable",
    animationStyle: ["subtle"],
    assetRefinements: firstAsset
      ? [
          {
            url: firstAsset.url,
            suggestedClassification: firstAsset.classification,
            confidence: 0.92,
            reason: "vision agrees with the heuristic classification",
          },
        ]
      : [],
    logoRefinement: null,
  };
  await writeFile(join(outDir, "vision-classification.json"), JSON.stringify(vision, null, 2));

  const result = mergeBrandJson(
    { crawlArtifact: artifact, extraction, vision },
    { onLog: (e) => console.log(`[merge:${e.level}] ${e.step}: ${e.message}`) },
  );
  await writeFile(join(outDir, "expected-brand-kit-result.json"), JSON.stringify(result, null, 2));

  console.log(`\nWrote fixture set to ${outDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
