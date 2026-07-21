import { LocalFsAssetStore, LocalFsJobStore } from "./local-fs";
import { R2AssetStore } from "./r2";
import { SupabaseJobStore } from "./supabase";
import type { AssetStore, JobStore } from "./types";

/**
 * Picks the job store: Supabase if `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` are set,
 * otherwise the local filesystem — the "zero env vars for dev/CI" adapter the spec asks for.
 */
export function createJobStore(): JobStore {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) return new SupabaseJobStore(url, key);
  return new LocalFsJobStore();
}

/**
 * Picks the asset store: R2 if `R2_ACCOUNT_ID`/`R2_ACCESS_KEY_ID`/`R2_SECRET_ACCESS_KEY`/
 * `R2_BUCKET` are all set, otherwise the local filesystem.
 */
export function createAssetStore(): AssetStore {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;
  if (accountId && accessKeyId && secretAccessKey && bucket) {
    return new R2AssetStore({ accountId, accessKeyId, secretAccessKey, bucket });
  }
  return new LocalFsAssetStore();
}
