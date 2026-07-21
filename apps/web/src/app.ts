import { Hono } from "hono";

import { generateOpenApiDocument } from "./openapi";
import { SlidingWindowRateLimiter } from "./rate-limit";
import { createAnalyzeRoute } from "./routes/analyze";
import { createAssetsRoute } from "./routes/assets";
import { createBrandRoute } from "./routes/brand";
import { createComponentsRoute } from "./routes/components";
import { createAssetStore, createJobStore } from "./storage/store-factory";
import type { AssetStore, JobStore } from "./storage/types";

export interface CreateAppOptions {
  jobStore?: JobStore;
  assetStore?: AssetStore;
  limiter?: SlidingWindowRateLimiter;
  /** Test-only escape hatch for the crawler's SSRF guard, forwarded to every job. Never set outside of tests. */
  allowPrivateNetwork?: boolean;
}

/**
 * Assembles the Hono app: every route under `/api`, plus `/api/openapi.json`. Mounted into
 * Next.js at `app/api/[[...route]]/route.ts`. Tests call this directly and use `app.request(...)`
 * — no real HTTP server needed (see `src/app.test.ts`).
 */
export function createApp(options: CreateAppOptions = {}): Hono {
  const jobStore = options.jobStore ?? createJobStore();
  const assetStore = options.assetStore ?? createAssetStore();

  const app = new Hono().basePath("/api");

  const analyzeDeps: Parameters<typeof createAnalyzeRoute>[0] = { jobStore, assetStore };
  if (options.limiter !== undefined) analyzeDeps.limiter = options.limiter;
  if (options.allowPrivateNetwork !== undefined) {
    analyzeDeps.allowPrivateNetwork = options.allowPrivateNetwork;
  }
  app.route("/", createAnalyzeRoute(analyzeDeps));
  app.route("/", createBrandRoute({ jobStore }));
  app.route("/", createAssetsRoute({ assetStore }));
  app.route("/", createComponentsRoute({ jobStore }));

  app.get("/openapi.json", (c) => c.json(generateOpenApiDocument()));

  return app;
}
