import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { crawlUrl } from "./crawl.js";
import { CrawlArtifactSchema } from "./schema.js";

const fixtureRoot = fileURLToPath(new URL("../examples/fixtures/sites/basic/", import.meta.url));

const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html",
  ".css": "text/css",
  ".svg": "image/svg+xml",
};

function startFixtureServer(): Promise<{ server: Server; baseUrl: string }> {
  const server = createServer((req, res) => {
    const path = req.url === "/" ? "/index.html" : (req.url ?? "/index.html");
    const filePath = join(fixtureRoot, path);
    if (!filePath.startsWith(fixtureRoot)) {
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
      .catch(() => {
        res.writeHead(404).end();
      });
  });

  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("expected a TCP address");
      resolve({ server, baseUrl: `http://127.0.0.1:${address.port}` });
    });
  });
}

describe("crawlUrl (integration, local fixture server only — never a live site)", () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    ({ server, baseUrl } = await startFixtureServer());
  }, 30_000);

  afterAll(() => {
    server.close();
  });

  it("crawls the fixture site and produces a valid CrawlArtifact", async () => {
    const artifact = await crawlUrl(`${baseUrl}/`, {
      allowPrivateNetwork: true,
      respectRobotsTxt: false,
    });

    expect(() => CrawlArtifactSchema.parse(artifact)).not.toThrow();

    expect(artifact.meta.title).toBe("Fixture Co.");
    expect(artifact.meta.description).toContain("fixture site");
    expect(artifact.html).toContain("Welcome to Fixture Co.");
    expect(artifact.finalUrl.startsWith(baseUrl)).toBe(true);
    expect(artifact.redirectChain).toEqual([`${baseUrl}/`]);

    const stylesheetHrefs = artifact.stylesheets.map((s) => s.href);
    expect(stylesheetHrefs).toContain(`${baseUrl}/styles.css`);
    expect(artifact.stylesheets.some((s) => s.href === null)).toBe(true);
    const linked = artifact.stylesheets.find((s) => s.href === `${baseUrl}/styles.css`);
    expect(linked?.content).toContain("font-family");

    const h1 = artifact.computedStyles.find((entry) => entry.selector === "h1");
    expect(h1?.styles).not.toBeNull();
    expect(h1?.styles?.fontWeight).toBe("700");

    expect(artifact.screenshotFullPage.length).toBeGreaterThan(0);
    expect(artifact.screenshotViewport.length).toBeGreaterThan(0);

    const assetUrls = artifact.assets.map((a) => a.url);
    expect(assetUrls).toContain(`${baseUrl}/logo.svg`);

    expect(artifact.faviconCandidates.length).toBeGreaterThan(0);
    expect(artifact.faviconCandidates.some((f) => f.rel === "apple-touch-icon")).toBe(true);
  }, 30_000);
});
