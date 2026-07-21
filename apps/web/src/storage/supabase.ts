import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Job } from "../schema";
import type { JobStore } from "./types";

const JOBS_TABLE = "jobs";

/**
 * Real Supabase-backed `JobStore` — one row per job in a `jobs(id text primary key, data
 * jsonb)` table, the whole `Job` stored as `data`. Constructed only when `SUPABASE_URL`/
 * `SUPABASE_SERVICE_ROLE_KEY` are set (see `store-factory.ts`); no test in this repo exercises
 * it (no credentials available here), same as `AnthropicVisionProvider` in Phase 3.
 *
 * Known limitation: `update` is read-then-write, not a single atomic operation — under
 * concurrent updates to the *same* job from *multiple processes* (a real deployment, not local
 * dev) the last write wins rather than being serialized like `LocalFsJobStore`'s in-process
 * queue. A production hardening pass would move the read-modify-write into a Postgres function
 * (`FOR UPDATE` row lock) or add optimistic concurrency via a version column.
 */
export class SupabaseJobStore implements JobStore {
  private readonly client: SupabaseClient;

  constructor(url: string, serviceRoleKey: string) {
    this.client = createClient(url, serviceRoleKey);
  }

  async create(job: Job): Promise<void> {
    const { error } = await this.client.from(JOBS_TABLE).insert({ id: job.id, data: job });
    if (error) throw new Error(`SupabaseJobStore.create: ${error.message}`);
  }

  async get(id: string): Promise<Job | null> {
    const { data, error } = await this.client
      .from(JOBS_TABLE)
      .select("data")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(`SupabaseJobStore.get: ${error.message}`);
    return (data?.data as Job | undefined) ?? null;
  }

  async update(id: string, updater: (job: Job) => Job): Promise<Job> {
    const current = await this.get(id);
    if (!current) throw new Error(`job ${id} not found`);
    const next = updater(current);
    const { error } = await this.client.from(JOBS_TABLE).update({ data: next }).eq("id", id);
    if (error) throw new Error(`SupabaseJobStore.update: ${error.message}`);
    return next;
  }
}
