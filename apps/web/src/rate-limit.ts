import type { Context, MiddlewareHandler } from "hono";

/**
 * An in-memory sliding-window rate limiter. Single-instance/dev-appropriate by design — it
 * doesn't survive multiple server instances or restarts, which is fine for this phase's "local
 * adapters, zero cloud creds" scope; a real multi-instance deployment would need a shared store
 * (e.g. Redis) instead.
 */
export class SlidingWindowRateLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(
    private readonly windowMs: number,
    private readonly max: number,
  ) {}

  /** Returns `true` if `key` is allowed to proceed, recording the attempt either way. */
  allow(key: string, now: number = Date.now()): boolean {
    const windowStart = now - this.windowMs;
    const recent = (this.hits.get(key) ?? []).filter((t) => t > windowStart);
    if (recent.length >= this.max) {
      this.hits.set(key, recent);
      return false;
    }
    recent.push(now);
    this.hits.set(key, recent);
    return true;
  }
}

function clientKey(c: Context): string {
  return c.req.header("x-forwarded-for") ?? c.req.header("cf-connecting-ip") ?? "unknown";
}

/** Hono middleware applying `limiter` per-client (by `x-forwarded-for`/`cf-connecting-ip`). */
export function rateLimit(limiter: SlidingWindowRateLimiter): MiddlewareHandler {
  return async (c, next) => {
    if (!limiter.allow(clientKey(c))) {
      return c.json({ error: "rate limit exceeded, try again shortly" }, 429);
    }
    await next();
  };
}
