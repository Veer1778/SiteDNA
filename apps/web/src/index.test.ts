import { describe, expect, it } from "vitest";

import { API_SCHEMA_VERSION, PACKAGE_NAME } from "./index.js";

describe("@brandkit/web", () => {
  it("exposes its package identity", () => {
    expect(PACKAGE_NAME).toBe("@brandkit/web");
  });

  it("targets a concrete Brand JSON schema version", () => {
    expect(API_SCHEMA_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
