import { Hono } from "hono";

import { ComponentsResponseSchema } from "../schema";
import type { JobStore } from "../storage/types";

export interface ComponentsRouteDeps {
  jobStore: JobStore;
}

/**
 * `GET /components/:id` (`:id` is a job id) returns the job's detected UI components.
 * Currently always `[]` — no phase implements component detection yet (see
 * `packages/brand-engine`'s completeness report) — but the endpoint is real and forward-
 * compatible with `BrandJson.components` once some phase populates it.
 */
export function createComponentsRoute(deps: ComponentsRouteDeps): Hono {
  const app = new Hono();

  app.get("/components/:id", async (c) => {
    const job = await deps.jobStore.get(c.req.param("id"));
    if (!job) return c.json({ error: "job not found" }, 404);
    const components = job.brandKit?.brandJson.components ?? [];
    return c.json(ComponentsResponseSchema.parse({ components }));
  });

  return app;
}
