import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { Job } from "../schema";
import { LocalFsAssetStore, LocalFsJobStore } from "./local-fs";

function makeJob(overrides: Partial<Job> = {}): Job {
  return {
    id: "job-1",
    url: "https://example.test/",
    status: "queued",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    logs: [],
    assets: [],
    ...overrides,
  };
}

describe("LocalFsJobStore", () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "brandkit-jobstore-"));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("round-trips a created job", async () => {
    const store = new LocalFsJobStore(dir);
    const job = makeJob();
    await store.create(job);
    expect(await store.get(job.id)).toEqual(job);
  });

  it("returns null for a job that doesn't exist", async () => {
    const store = new LocalFsJobStore(dir);
    expect(await store.get("nope")).toBeNull();
  });

  it("applies an updater function and persists the result", async () => {
    const store = new LocalFsJobStore(dir);
    await store.create(makeJob());
    const updated = await store.update("job-1", (job) => ({ ...job, status: "crawling" }));
    expect(updated.status).toBe("crawling");
    expect((await store.get("job-1"))?.status).toBe("crawling");
  });

  it("throws when updating a job that doesn't exist", async () => {
    const store = new LocalFsJobStore(dir);
    await expect(store.update("nope", (job) => job)).rejects.toThrow();
  });

  it("serializes concurrent updates to the same job without losing writes", async () => {
    const store = new LocalFsJobStore(dir);
    await store.create(makeJob({ logs: [] }));

    await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        store.update("job-1", (job) => ({
          ...job,
          logs: [
            ...job.logs,
            { level: "info", step: "x", message: String(i), timestamp: new Date().toISOString() },
          ],
        })),
      ),
    );

    const final = await store.get("job-1");
    expect(final?.logs).toHaveLength(20);
  });
});

describe("LocalFsAssetStore", () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "brandkit-assetstore-"));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("round-trips bytes and content type", async () => {
    const store = new LocalFsAssetStore(dir);
    const bytes = Buffer.from("hello world");
    await store.put("job-1:full-page", bytes, "image/png");

    const result = await store.get("job-1:full-page");
    expect(result?.bytes.equals(bytes)).toBe(true);
    expect(result?.contentType).toBe("image/png");
  });

  it("returns null for a key that doesn't exist", async () => {
    const store = new LocalFsAssetStore(dir);
    expect(await store.get("nope")).toBeNull();
  });
});
