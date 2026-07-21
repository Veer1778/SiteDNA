import { describe, expect, it } from "vitest";

import { PACKAGE_NAME } from "./index.js";

describe("@brandkit/vision", () => {
  it("exposes its package identity", () => {
    expect(PACKAGE_NAME).toBe("@brandkit/vision");
  });
});
