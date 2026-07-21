import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import type { Job } from "../schema";
import type { AssetStore, JobStore } from "./types";

/**
 * Serializes concurrent operations on the same key through an in-memory promise chain — enough
 * to keep a single Node process's read-modify-write cycles from racing. Not a substitute for a
 * real lock across multiple processes (fine for local dev; the Supabase adapter gets that for
 * free from the database).
 */
class KeyedQueue {
  private queues = new Map<string, Promise<unknown>>();

  run<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const prior = this.queues.get(key) ?? Promise.resolve();
    const chained = prior.catch(() => undefined).then(fn);
    this.queues.set(
      key,
      chained.then(
        () => undefined,
        () => undefined,
      ),
    );
    return chained;
  }
}

/** Default local dev storage root — override via `dir` in the constructors below. */
export const DEFAULT_DATA_DIR = ".data";

export class LocalFsJobStore implements JobStore {
  private readonly dir: string;
  private readonly queue = new KeyedQueue();

  constructor(dir: string = join(DEFAULT_DATA_DIR, "jobs")) {
    this.dir = dir;
  }

  private pathFor(id: string): string {
    return join(this.dir, `${id}.json`);
  }

  async create(job: Job): Promise<void> {
    await mkdir(this.dir, { recursive: true });
    await writeFile(this.pathFor(job.id), JSON.stringify(job, null, 2));
  }

  async get(id: string): Promise<Job | null> {
    try {
      return JSON.parse(await readFile(this.pathFor(id), "utf-8")) as Job;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }

  async update(id: string, updater: (job: Job) => Job): Promise<Job> {
    return this.queue.run(id, async () => {
      const current = await this.get(id);
      if (!current) throw new Error(`job ${id} not found`);
      const next = updater(current);
      await writeFile(this.pathFor(id), JSON.stringify(next, null, 2));
      return next;
    });
  }
}

export class LocalFsAssetStore implements AssetStore {
  private readonly dir: string;

  constructor(dir: string = join(DEFAULT_DATA_DIR, "assets")) {
    this.dir = dir;
  }

  private pathFor(key: string): string {
    return join(this.dir, encodeURIComponent(key));
  }

  async put(key: string, bytes: Buffer, contentType: string): Promise<void> {
    await mkdir(this.dir, { recursive: true });
    await writeFile(this.pathFor(key), bytes);
    await writeFile(`${this.pathFor(key)}.meta.json`, JSON.stringify({ contentType }));
  }

  async get(key: string): Promise<{ bytes: Buffer; contentType: string } | null> {
    try {
      const [bytes, metaRaw] = await Promise.all([
        readFile(this.pathFor(key)),
        readFile(`${this.pathFor(key)}.meta.json`, "utf-8"),
      ]);
      const { contentType } = JSON.parse(metaRaw) as { contentType: string };
      return { bytes, contentType };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }
}
