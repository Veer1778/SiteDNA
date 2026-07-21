import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { Job } from "./schema";
import type { AssetStore, JobStore } from "./storage/types";

/** In-memory `JobStore`/`AssetStore` for fast tests — no disk I/O, no concurrency guarantees needed. */
export class MemoryJobStore implements JobStore {
  private readonly jobs = new Map<string, Job>();

  async create(job: Job): Promise<void> {
    this.jobs.set(job.id, job);
  }

  async get(id: string): Promise<Job | null> {
    return this.jobs.get(id) ?? null;
  }

  async update(id: string, updater: (job: Job) => Job): Promise<Job> {
    const current = this.jobs.get(id);
    if (!current) throw new Error(`job ${id} not found`);
    const next = updater(current);
    this.jobs.set(id, next);
    return next;
  }
}

export class MemoryAssetStore implements AssetStore {
  private readonly assets = new Map<string, { bytes: Buffer; contentType: string }>();

  async put(key: string, bytes: Buffer, contentType: string): Promise<void> {
    this.assets.set(key, { bytes, contentType });
  }

  async get(key: string): Promise<{ bytes: Buffer; contentType: string } | null> {
    return this.assets.get(key) ?? null;
  }
}

const fixtureRoot = fileURLToPath(
  new URL("../../../packages/crawler/examples/fixtures/sites/basic/", import.meta.url),
);

const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html",
  ".css": "text/css",
  ".svg": "image/svg+xml",
};

/**
 * Starts a local static server for `packages/crawler`'s fixture site — the same one every
 * pipeline package's own tests use. Never a live site.
 */
export function startFixtureServer(): Promise<{ server: Server; baseUrl: string }> {
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
      .catch(() => res.writeHead(404).end());
  });

  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("expected a TCP address");
      resolve({ server, baseUrl: `http://127.0.0.1:${address.port}` });
    });
  });
}
