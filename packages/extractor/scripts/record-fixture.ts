#!/usr/bin/env tsx
/**
 * Regenerates examples/fixtures/crawl-artifacts/basic-site/ by crawling
 * packages/crawler's local static fixture site (never a live site). Not run in CI —
 * a one-off/occasional tool for keeping the recorded fixture in sync with the source site.
 *
 * Usage: pnpm --filter @brandkit/extractor record-fixture
 */
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { crawlUrl, writeCrawlArtifactToDir } from "@brandkit/crawler";

const fixtureSiteRoot = fileURLToPath(
  new URL("../../crawler/examples/fixtures/sites/basic/", import.meta.url),
);
const outDir = fileURLToPath(
  new URL("../examples/fixtures/crawl-artifacts/basic-site/", import.meta.url),
);

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
    onLog: (event) => console.log(`[${event.level}] ${event.step}: ${event.message}`),
  });

  await writeCrawlArtifactToDir(artifact, outDir);
  console.log(`\nWrote fixture to ${outDir}`);

  server.close();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
