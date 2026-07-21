#!/usr/bin/env tsx
/**
 * Manual verification tool for Phase 1's acceptance criterion ("crawling one real site manually
 * produces a valid artifact") and a fixture-generation helper for Phase 2. Not run in CI.
 *
 * Usage: pnpm --filter @brandkit/crawler crawl <url> [outDir]
 */
import { crawlUrl } from "../src/crawl.js";
import { writeCrawlArtifactToDir } from "../src/serialize.js";

async function main() {
  const url = process.argv[2];
  const outDir = process.argv[3] ?? "./tmp/manual-crawl";
  if (!url) {
    console.error("usage: pnpm --filter @brandkit/crawler crawl <url> [outDir]");
    process.exitCode = 1;
    return;
  }

  const artifact = await crawlUrl(url, {
    onLog: (event) => {
      console.log(`[${event.level}] ${event.step}: ${event.message}`);
    },
  });

  await writeCrawlArtifactToDir(artifact, outDir);
  console.log(`\nWrote crawl artifact to ${outDir}`);
  console.log(`  finalUrl: ${artifact.finalUrl}`);
  console.log(`  title: ${artifact.meta.title}`);
  console.log(`  stylesheets: ${artifact.stylesheets.length}`);
  console.log(`  assets: ${artifact.assets.length}`);
  console.log(`  faviconCandidates: ${artifact.faviconCandidates.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
