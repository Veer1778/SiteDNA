import { describe, expect, it } from "vitest";

import { PACKAGE_NAME } from "./index.js";

describe("@brandkit/template-engine", () => {
  it("exposes its package identity", () => {
    expect(PACKAGE_NAME).toBe("@brandkit/template-engine");
  });
});
