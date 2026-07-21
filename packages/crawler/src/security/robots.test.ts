import { describe, expect, it } from "vitest";

import { isAllowedByRobots, parseRobotsTxt } from "./robots.js";

describe("parseRobotsTxt / isAllowedByRobots", () => {
  it("allows everything when there are no rules", () => {
    const rules = parseRobotsTxt("");
    expect(isAllowedByRobots(rules, "BrandKitAI", "/anything")).toBe(true);
  });

  it("disallows a path blocked for the wildcard group", () => {
    const rules = parseRobotsTxt(`
      User-agent: *
      Disallow: /private
    `);
    expect(isAllowedByRobots(rules, "BrandKitAI", "/private/page")).toBe(false);
    expect(isAllowedByRobots(rules, "BrandKitAI", "/public")).toBe(true);
  });

  it("prefers an exact user-agent match over the wildcard group", () => {
    const rules = parseRobotsTxt(`
      User-agent: *
      Disallow: /

      User-agent: BrandKitAI
      Disallow: /admin
    `);
    expect(isAllowedByRobots(rules, "BrandKitAI", "/anything")).toBe(true);
    expect(isAllowedByRobots(rules, "BrandKitAI", "/admin/panel")).toBe(false);
    expect(isAllowedByRobots(rules, "SomeOtherBot", "/anything")).toBe(false);
  });

  it("applies one directive to multiple stacked user-agent lines", () => {
    const rules = parseRobotsTxt(`
      User-agent: BrandKitAI
      User-agent: OtherBot
      Disallow: /shared
    `);
    expect(isAllowedByRobots(rules, "BrandKitAI", "/shared/x")).toBe(false);
    expect(isAllowedByRobots(rules, "OtherBot", "/shared/x")).toBe(false);
  });

  it("lets a more specific Allow override a broader Disallow", () => {
    const rules = parseRobotsTxt(`
      User-agent: *
      Disallow: /docs
      Allow: /docs/public
    `);
    expect(isAllowedByRobots(rules, "BrandKitAI", "/docs/secret")).toBe(false);
    expect(isAllowedByRobots(rules, "BrandKitAI", "/docs/public/page")).toBe(true);
  });

  it("ignores comments and unsupported fields", () => {
    const rules = parseRobotsTxt(`
      # comment
      User-agent: *
      Crawl-delay: 10
      Disallow: /blocked
      Sitemap: https://example.com/sitemap.xml
    `);
    expect(isAllowedByRobots(rules, "BrandKitAI", "/blocked")).toBe(false);
    expect(isAllowedByRobots(rules, "BrandKitAI", "/ok")).toBe(true);
  });
});
