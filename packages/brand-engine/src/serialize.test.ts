import { SCHEMA_VERSION } from "@brandkit/shared";
import { describe, expect, it } from "vitest";

import {
  deserializeBrandJson,
  migrateBrandJson,
  MIGRATIONS,
  serializeBrandJson,
  UnsupportedSchemaVersionError,
} from "./serialize.js";
import { makeBrandJson } from "./test-utils.js";

describe("serializeBrandJson / deserializeBrandJson", () => {
  it("round-trips a valid Brand JSON", () => {
    const brandJson = makeBrandJson({ sourceUrl: "https://example.com/" });
    const json = serializeBrandJson(brandJson);
    expect(deserializeBrandJson(json)).toEqual(brandJson);
  });

  it("throws on an invalid Brand JSON", () => {
    const invalid = { ...makeBrandJson(), schemaVersion: "not-a-real-version" };
    // @ts-expect-error intentionally invalid for the test
    expect(() => serializeBrandJson(invalid)).toThrow();
  });

  it("throws on malformed JSON text", () => {
    expect(() => deserializeBrandJson("{not json")).toThrow();
  });
});

describe("migrateBrandJson", () => {
  it("validates and returns input already at the current schema version", () => {
    const brandJson = makeBrandJson();
    expect(migrateBrandJson(brandJson)).toEqual(brandJson);
  });

  it("throws UnsupportedSchemaVersionError for an untagged input", () => {
    expect(() => migrateBrandJson({ foo: "bar" })).toThrow(UnsupportedSchemaVersionError);
  });

  it("throws UnsupportedSchemaVersionError for a version with no registered migration", () => {
    expect(() => migrateBrandJson({ schemaVersion: "0.0.1" })).toThrow(
      UnsupportedSchemaVersionError,
    );
  });

  it("has no migrations registered yet — there is no prior schema version to migrate from", () => {
    expect(Object.keys(MIGRATIONS)).toEqual([]);
  });

  it("current SCHEMA_VERSION constant matches what makeBrandJson uses", () => {
    expect(makeBrandJson().schemaVersion).toBe(SCHEMA_VERSION);
  });
});
