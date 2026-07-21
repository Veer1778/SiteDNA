import { Hono } from "hono";

import { BrandResponseSchema } from "../schema";
import type { JobStore } from "../storage/types";

export interface BrandRouteDeps {
  jobStore: JobStore;
}

/**
 * `GET /brand/:id` doubles as the status endpoint — there is no separate `GET /jobs/:id`. It
 * returns `{ status, brandKit: undefined }` while a job is in progress, `brandKit` populated
 * once `status === "done"`, and `error` populated once `status === "failed"`.
 */
export function createBrandRoute(deps: BrandRouteDeps): Hono {
  const app = new Hono();

  app.get("/brand/:id", async (c) => {
    const job = await deps.jobStore.get(c.req.param("id"));
    if (!job) return c.json({ error: "job not found" }, 404);
    const { url: _url, ...rest } = job;
    return c.json(BrandResponseSchema.parse(rest));
  });

  return app;
}
