import type { Server } from "node:http";
import { BrandJsonSchema } from "@brandkit/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "./app";
import { SlidingWindowRateLimiter } from "./rate-limit";
import { MemoryAssetStore, MemoryJobStore, startFixtureServer } from "./test-utils";

async function pollUntilDone(app: ReturnType<typeof createApp>, id: string, timeoutMs = 20_000) {
  const start = Date.now();
  for (;;) {
    const res = await app.request(`/api/brand/${id}`);
    const body = (await res.json()) as { status: string };
    if (body.status === "done" || body.status === "failed") return body;
    if (Date.now() - start > timeoutMs) throw new Error("timed out waiting for job to finish");
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

describe("createApp (backend integration, local fixture server only — never a live site)", () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    ({ server, baseUrl } = await startFixtureServer());
  }, 30_000);

  afterAll(() => {
    server.close();
  });

  it("POST /analyze -> poll GET /brand/:id -> a valid, done BrandKit; assets and components are reachable", async () => {
    const app = createApp({
      jobStore: new MemoryJobStore(),
      assetStore: new MemoryAssetStore(),
      allowPrivateNetwork: true,
    });

    const analyzeRes = await app.request("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: `${baseUrl}/` }),
    });
    expect(analyzeRes.status).toBe(202);
    const { id } = (await analyzeRes.json()) as { id: string };

    const finalBody = await pollUntilDone(app, id);
    expect(finalBody.status).toBe("done");
    const brandKit = (finalBody as { brandKit: { brandJson: unknown } }).brandKit;
    expect(() => BrandJsonSchema.parse(brandKit.brandJson)).not.toThrow();

    const assetsList = (finalBody as { assets: Array<{ id: string }> }).assets;
    const assetRes = await app.request(`/api/assets/${assetsList[0]!.id}`);
    expect(assetRes.status).toBe(200);
    expect(assetRes.headers.get("content-type")).toBe("image/png");
    expect((await assetRes.arrayBuffer()).byteLength).toBeGreaterThan(0);

    const componentsRes = await app.request(`/api/components/${id}`);
    expect(componentsRes.status).toBe(200);
    expect(await componentsRes.json()).toEqual({ components: [] });
  }, 30_000);

  it("GET /brand/:id returns 404 for an unknown job", async () => {
    const app = createApp({ jobStore: new MemoryJobStore(), assetStore: new MemoryAssetStore() });
    const res = await app.request("/api/brand/nope");
    expect(res.status).toBe(404);
  });

  it("GET /assets/:id returns 404 for an unknown asset", async () => {
    const app = createApp({ jobStore: new MemoryJobStore(), assetStore: new MemoryAssetStore() });
    const res = await app.request("/api/assets/nope");
    expect(res.status).toBe(404);
  });

  it("POST /analyze rejects an invalid body with a validation error, not a 500", async () => {
    const app = createApp({ jobStore: new MemoryJobStore(), assetStore: new MemoryAssetStore() });
    const res = await app.request("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: "not a url" }),
    });
    expect(res.status).toBe(400);
  });

  it("rate limits POST /analyze once the limiter's max is exceeded", async () => {
    const app = createApp({
      jobStore: new MemoryJobStore(),
      assetStore: new MemoryAssetStore(),
      limiter: new SlidingWindowRateLimiter(60_000, 1),
    });
    // A private-IP URL, rejected fast by the SSRF guard (no allowPrivateNetwork here) — this
    // test only cares about the rate limiter's own response, and must never touch a live site.
    const body = JSON.stringify({ url: "http://127.0.0.1:1/" });
    const headers = { "Content-Type": "application/json" };

    const first = await app.request("/api/analyze", { method: "POST", headers, body });
    expect(first.status).toBe(202);

    const second = await app.request("/api/analyze", { method: "POST", headers, body });
    expect(second.status).toBe(429);
  });

  it("GET /openapi.json returns a document covering every route", async () => {
    const app = createApp({ jobStore: new MemoryJobStore(), assetStore: new MemoryAssetStore() });
    const res = await app.request("/api/openapi.json");
    expect(res.status).toBe(200);
    const doc = (await res.json()) as { paths: Record<string, unknown> };
    expect(Object.keys(doc.paths)).toEqual(
      expect.arrayContaining([
        "/api/analyze",
        "/api/brand/{id}",
        "/api/assets/{id}",
        "/api/components/{id}",
      ]),
    );
  });
});
