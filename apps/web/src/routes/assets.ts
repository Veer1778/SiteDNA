import { Hono } from "hono";

import type { AssetStore } from "../storage/types";

export interface AssetsRouteDeps {
  assetStore: AssetStore;
}

/** `GET /assets/:id` streams raw bytes — `:id` is the opaque key `jobs.ts` stored it under (e.g. `<jobId>:full-page`). */
export function createAssetsRoute(deps: AssetsRouteDeps): Hono {
  const app = new Hono();

  app.get("/assets/:id", async (c) => {
    const asset = await deps.assetStore.get(c.req.param("id"));
    if (!asset) return c.json({ error: "asset not found" }, 404);
    return c.body(new Uint8Array(asset.bytes), 200, { "Content-Type": asset.contentType });
  });

  return app;
}
