import type { Job } from "../schema";

/**
 * Persists job records. `update` is a read-modify-write keyed by `id`, serialized per-id so
 * concurrent updates to the same job (e.g. rapid log appends during a pipeline run) don't race
 * — implementations must guarantee that, not callers.
 */
export interface JobStore {
  create(job: Job): Promise<void>;
  get(id: string): Promise<Job | null>;
  update(id: string, updater: (job: Job) => Job): Promise<Job>;
}

/** Persists binary assets (screenshots, etc.), addressable by an opaque `key`. */
export interface AssetStore {
  put(key: string, bytes: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<{ bytes: Buffer; contentType: string } | null>;
}
