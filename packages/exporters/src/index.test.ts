import { describe, expect, it } from "vitest";

import { PACKAGE_NAME } from "./index.js";

describe("@brandkit/exporters", () => {
  it("exposes its package identity", () => {
    expect(PACKAGE_NAME).toBe("@brandkit/exporters");
  });
});
