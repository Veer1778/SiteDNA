import { describe, expect, it } from "vitest";

import { PACKAGE_NAME, TARGET_SCHEMA_VERSION } from "./index.js";

describe("@brandkit/brand-engine", () => {
  it("exposes its package identity", () => {
    expect(PACKAGE_NAME).toBe("@brandkit/brand-engine");
  });

  it("targets a concrete Brand JSON schema version", () => {
    expect(TARGET_SCHEMA_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
