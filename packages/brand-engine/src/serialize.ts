import { type BrandJson, BrandJsonSchema, SCHEMA_VERSION } from "@brandkit/shared";

/** Thrown by {@link migrateBrandJson} when `input.schemaVersion` has no known migration path. */
export class UnsupportedSchemaVersionError extends Error {}

/** Validates `brandJson`, then stringifies it. Throws if it doesn't match `BrandJsonSchema`. */
export function serializeBrandJson(brandJson: BrandJson): string {
  return JSON.stringify(BrandJsonSchema.parse(brandJson));
}

/** Parses `json`, then validates it against `BrandJsonSchema`. */
export function deserializeBrandJson(json: string): BrandJson {
  return BrandJsonSchema.parse(JSON.parse(json));
}

/**
 * Migration stub: `packages/shared`'s Brand JSON schema has only ever had one version
 * (`SCHEMA_VERSION`), so there is nothing to migrate *from* yet. This is the extension point for
 * when that changes — add an entry here mapping an old `schemaVersion` string to a function that
 * upgrades that shape to the current one. `migrateBrandJson` will then validate the result.
 */
export const MIGRATIONS: Record<string, (old: unknown) => unknown> = {};

function extractSchemaVersion(input: unknown): string | undefined {
  if (typeof input !== "object" || input === null || !("schemaVersion" in input)) return undefined;
  const version = (input as { schemaVersion: unknown }).schemaVersion;
  return typeof version === "string" ? version : undefined;
}

/**
 * Validates `input` as a `BrandJson`, migrating it first if it's tagged with an older
 * `schemaVersion` that has a registered migration in {@link MIGRATIONS}. Throws
 * {@link UnsupportedSchemaVersionError} for an untagged input or a version with no migration.
 */
export function migrateBrandJson(input: unknown): BrandJson {
  const version = extractSchemaVersion(input);
  if (version === undefined) {
    throw new UnsupportedSchemaVersionError("input has no schemaVersion field");
  }
  if (version === SCHEMA_VERSION) {
    return BrandJsonSchema.parse(input);
  }
  const migrate = MIGRATIONS[version];
  if (!migrate) {
    throw new UnsupportedSchemaVersionError(
      `no migration registered for schemaVersion "${version}" (current: "${SCHEMA_VERSION}")`,
    );
  }
  return BrandJsonSchema.parse(migrate(input));
}
