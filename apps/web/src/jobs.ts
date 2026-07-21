import { crawlUrl } from "@brandkit/crawler";
import { extractAll } from "@brandkit/extractor";
import { mergeBrandJson } from "@brandkit/brand-engine";
import { AnthropicVisionProvider, classifyFromCrawlArtifact } from "@brandkit/vision";

import { consoleLogger } from "./log";
import type { Job, JobStatus, LogEntry } from "./schema";
import type { AssetStore, JobStore } from "./storage/types";

export interface RunJobDeps {
  jobStore: JobStore;
  assetStore: AssetStore;
  /** Injectable for tests — defaults to checking `process.env.ANTHROPIC_API_KEY`. */
  visionEnabled?: boolean;
  /** Test-only escape hatch for the crawler's SSRF guard. Never set outside of tests. */
  allowPrivateNetwork?: boolean;
}

function nowIso(): string {
  return new Date().toISOString();
}

// Real-world crawls need more slack than the crawler's own test suite (against a trivial local
// fixture) does: some sites are just slow to load in the first place (large asset graphs, slow
// origins), and a full-page screenshot of a very long marketing page can itself take a while
// once navigation has already succeeded. The web app widens the ceiling for real-world crawls;
// this doesn't change what "done" means, only how long a slow-but-working crawl gets before the
// job is given up on.
const WEB_NAVIGATION_TIMEOUT_MS = 45_000;
const WEB_TOTAL_TIMEOUT_MS = 75_000;

// Playwright error messages (e.g. TimeoutError) embed ANSI color codes in their "Call log"
// section unconditionally, regardless of TTY — left as-is they render as garbled escape
// sequences in the web UI. Strip them at this presentation boundary rather than teaching every
// consumer of `Job.logs`/`Job.error` to do it.
// eslint-disable-next-line no-control-regex -- deliberately matching ANSI CSI escape sequences
const ANSI_ESCAPE_PATTERN = /\x1b\[[0-9;]*m/g;
function sanitizeErrorMessage(message: string): string {
  return message.replace(ANSI_ESCAPE_PATTERN, "").trim();
}

/**
 * Runs the full pipeline for `job.id`/`job.url` in the background (not awaited by the caller —
 * `POST /analyze` returns as soon as the job is created). Every pipeline package's `onLog` is
 * wired into two sinks: the server console and the job's persisted `logs` — see "Project
 * logging" in the Phase 5 plan. Vision AI runs only if `ANTHROPIC_API_KEY` is configured;
 * otherwise the job goes straight from `extracting` to `done` via the merge step.
 */
export async function runJob(job: Job, deps: RunJobDeps): Promise<void> {
  const { jobStore, assetStore } = deps;
  const visionEnabled = deps.visionEnabled ?? Boolean(process.env.ANTHROPIC_API_KEY);

  const appendLog = async (entry: Omit<LogEntry, "timestamp">) => {
    const sanitized = { ...entry, message: sanitizeErrorMessage(entry.message) };
    consoleLogger(sanitized);
    await jobStore.update(job.id, (current) => ({
      ...current,
      logs: [...current.logs, { ...sanitized, timestamp: nowIso() }],
      updatedAt: nowIso(),
    }));
  };
  const onLog = (entry: Omit<LogEntry, "timestamp">) => {
    appendLog(entry).catch((error: unknown) => {
      consoleLogger({
        level: "error",
        step: "log-persist-failed",
        message: error instanceof Error ? error.message : String(error),
      });
    });
  };

  const setStatus = async (status: JobStatus) => {
    await jobStore.update(job.id, (current) => ({ ...current, status, updatedAt: nowIso() }));
  };

  try {
    await setStatus("crawling");
    const crawlOptions: Parameters<typeof crawlUrl>[1] = {
      onLog,
      navigationTimeoutMs: WEB_NAVIGATION_TIMEOUT_MS,
      totalTimeoutMs: WEB_TOTAL_TIMEOUT_MS,
    };
    if (deps.allowPrivateNetwork !== undefined)
      crawlOptions.allowPrivateNetwork = deps.allowPrivateNetwork;
    const crawlArtifact = await crawlUrl(job.url, crawlOptions);

    await setStatus("extracting");
    const extraction = await extractAll(crawlArtifact, { onLog });

    let vision;
    if (visionEnabled) {
      await setStatus("analyzing");
      vision = await classifyFromCrawlArtifact(crawlArtifact, new AnthropicVisionProvider(), {
        onLog,
        assetCandidates: extraction.assets.map((a) => ({
          url: a.url,
          currentClassification: a.classification,
        })),
      });
    } else {
      await appendLog({
        level: "info",
        step: "vision-skipped",
        message: "ANTHROPIC_API_KEY not set; skipping Vision AI",
      });
    }

    const mergeInputs: Parameters<typeof mergeBrandJson>[0] = { crawlArtifact, extraction };
    if (vision !== undefined) mergeInputs.vision = vision;
    const result = mergeBrandJson(mergeInputs, { onLog });

    await assetStore.put(`${job.id}:full-page`, crawlArtifact.screenshotFullPage, "image/png");
    await assetStore.put(`${job.id}:viewport`, crawlArtifact.screenshotViewport, "image/png");

    await jobStore.update(job.id, (current) => ({
      ...current,
      status: "done",
      brandKit: result,
      assets: [
        { id: `${job.id}:full-page`, kind: "screenshot-full", contentType: "image/png" },
        { id: `${job.id}:viewport`, kind: "screenshot-viewport", contentType: "image/png" },
      ],
      updatedAt: nowIso(),
    }));
  } catch (error) {
    const message = sanitizeErrorMessage(error instanceof Error ? error.message : String(error));
    await appendLog({ level: "error", step: "job-failed", message });
    await jobStore.update(job.id, (current) => ({
      ...current,
      status: "failed",
      error: message,
      updatedAt: nowIso(),
    }));
  }
}
