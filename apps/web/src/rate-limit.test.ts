import { describe, expect, it } from "vitest";

import { SlidingWindowRateLimiter } from "./rate-limit";

describe("SlidingWindowRateLimiter", () => {
  it("allows requests up to the max within the window", () => {
    const limiter = new SlidingWindowRateLimiter(1000, 3);
    expect(limiter.allow("a", 0)).toBe(true);
    expect(limiter.allow("a", 10)).toBe(true);
    expect(limiter.allow("a", 20)).toBe(true);
    expect(limiter.allow("a", 30)).toBe(false);
  });

  it("tracks separate keys independently", () => {
    const limiter = new SlidingWindowRateLimiter(1000, 1);
    expect(limiter.allow("a", 0)).toBe(true);
    expect(limiter.allow("b", 0)).toBe(true);
    expect(limiter.allow("a", 1)).toBe(false);
    expect(limiter.allow("b", 1)).toBe(false);
  });

  it("allows requests again once old ones fall outside the window", () => {
    const limiter = new SlidingWindowRateLimiter(1000, 1);
    expect(limiter.allow("a", 0)).toBe(true);
    expect(limiter.allow("a", 500)).toBe(false);
    expect(limiter.allow("a", 1001)).toBe(true);
  });
});
