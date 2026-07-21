import { randomUUID } from "node:crypto";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import { runJob } from "../jobs";
import { rateLimit, SlidingWindowRateLimiter } from "../rate-limit";
import { AnalyzeRequestSchema, AnalyzeResponseSchema, type Job } from "../schema";
import type { AssetStore, JobStore } from "../storage/types";

/** Default: 10 requests/minute per client — generous enough for interactive use, cheap to abuse without it. */
export const DEFAULT_RATE_LIMIT_WINDOW_MS = 60_000;
export const DEFAULT_RATE_LIMIT_MAX = 10;

export interface AnalyzeRouteDeps {
  jobStore: JobStore;
  assetStore: AssetStore;
  limiter?: SlidingWindowRateLimiter;
  /** Test-only escape hatch for the crawler's SSRF guard, forwarded to every job it starts. Never set outside of tests. */
  allowPrivateNetwork?: boolean;
}

export function createAnalyzeRoute(deps: AnalyzeRouteDeps): Hono {
  const app = new Hono();
  const limiter =
    deps.limiter ??
    new SlidingWindowRateLimiter(DEFAULT_RATE_LIMIT_WINDOW_MS, DEFAULT_RATE_LIMIT_MAX);

  app.post("/analyze", rateLimit(limiter), zValidator("json", AnalyzeRequestSchema), async (c) => {
    const { url } = c.req.valid("json");
    const id = randomUUID();
    const now = new Date().toISOString();
    const job: Job = {
      id,
      url,
      status: "queued",
      createdAt: now,
      updatedAt: now,
      logs: [],
      assets: [],
    };
    await deps.jobStore.create(job);

    // Fire-and-forget: the job runs in the background, POST /analyze responds immediately.
    const runJobDeps: Parameters<typeof runJob>[1] = {
      jobStore: deps.jobStore,
      assetStore: deps.assetStore,
    };
    if (deps.allowPrivateNetwork !== undefined)
      runJobDeps.allowPrivateNetwork = deps.allowPrivateNetwork;
    runJob(job, runJobDeps).catch(() => {
      // runJob already persists failures onto the job record; this catch only guards against
      // an unhandled rejection if persisting *that* failure somehow also throws.
    });

    return c.json(AnalyzeResponseSchema.parse({ id, status: job.status }), 202);
  });

  return app;
}
