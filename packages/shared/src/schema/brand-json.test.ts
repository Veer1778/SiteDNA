import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { BrandJsonSchema } from "./brand-json.js";

const fixturesDir = fileURLToPath(new URL("../../examples/fixtures/brand-json/", import.meta.url));

function readFixture(name: string): unknown {
  return JSON.parse(readFileSync(new URL(name, `file://${fixturesDir}`), "utf-8"));
}

describe("BrandJsonSchema", () => {
  it("parses a valid Brand JSON document and round-trips losslessly", () => {
    const raw = readFixture("valid.json");
    const parsed = BrandJsonSchema.parse(raw);
    // Zod's output for this schema has no transforms, so re-serializing must equal the input.
    expect(JSON.parse(JSON.stringify(parsed))).toEqual(raw);
  });

  const invalidFixtures = [
    "invalid-bad-hex-color.json",
    "invalid-confidence-out-of-range.json",
    "invalid-missing-required-field.json",
    "invalid-wrong-type.json",
    "invalid-schema-version.json",
  ];

  it.each(invalidFixtures)("rejects %s", (name) => {
    const raw = readFixture(name);
    const result = BrandJsonSchema.safeParse(raw);
    expect(result.success).toBe(false);
  });
});
