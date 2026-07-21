import type { Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { runJob } from "./jobs";
import type { Job } from "./schema";
import { MemoryAssetStore, MemoryJobStore, startFixtureServer } from "./test-utils";

function makeJob(url: string): Job {
  const now = new Date().toISOString();
  return {
    id: "job-1",
    url,
    status: "queued",
    createdAt: now,
    updatedAt: now,
    logs: [],
    assets: [],
  };
}

describe("runJob (integration, local fixture server only — never a live site)", () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    ({ server, baseUrl } = await startFixtureServer());
  }, 30_000);

  afterAll(() => {
    server.close();
  });

  it("crawls, extracts, merges, and produces a done job with a valid BrandKit", async () => {
    const jobStore = new MemoryJobStore();
    const assetStore = new MemoryAssetStore();
    const job = makeJob(`${baseUrl}/`);
    await jobStore.create(job);

    await runJob(job, { jobStore, assetStore, visionEnabled: false, allowPrivateNetwork: true });

    const final = await jobStore.get(job.id);
    expect(final?.status).toBe("done");
    expect(final?.brandKit?.brandJson.sourceUrl).toBe(`${baseUrl}/`);
    expect(final?.brandKit?.brandJson.colors.background?.hex).toBe("#ffffff");
    expect(final?.logs.length).toBeGreaterThan(0);
    expect(final?.assets).toHaveLength(2);

    const fullPage = await assetStore.get(`${job.id}:full-page`);
    expect(fullPage?.contentType).toBe("image/png");
    expect(fullPage?.bytes.length).toBeGreaterThan(0);
  }, 30_000);

  it("marks the job failed (not throwing) when the crawl target is unreachable", async () => {
    const jobStore = new MemoryJobStore();
    const assetStore = new MemoryAssetStore();
    const job = makeJob("http://127.0.0.1:1/"); // nothing listens on port 1
    await jobStore.create(job);

    await runJob(job, { jobStore, assetStore, visionEnabled: false, allowPrivateNetwork: true });

    const final = await jobStore.get(job.id);
    expect(final?.status).toBe("failed");
    expect(final?.error).toBeTruthy();
  });

  it("skips Vision AI and still completes when visionEnabled is false", async () => {
    const jobStore = new MemoryJobStore();
    const assetStore = new MemoryAssetStore();
    const job = makeJob(`${baseUrl}/`);
    await jobStore.create(job);

    await runJob(job, { jobStore, assetStore, visionEnabled: false, allowPrivateNetwork: true });

    const final = await jobStore.get(job.id);
    expect(final?.status).toBe("done");
    expect(final?.brandKit?.brandJson.voice).toEqual([]);
    expect(final?.logs.some((l) => l.step === "vision-skipped")).toBe(true);
  });
});
