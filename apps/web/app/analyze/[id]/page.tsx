"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { BrandKitViewer } from "../../../components/brand-kit/brand-kit-viewer";
import { BackHomeLink } from "../../../components/ui/back-home-link";
import { ProgressDial } from "../../../components/ui/progress-dial";
import type { BrandResponse, JobStatus } from "../../../src/schema";

const STEP_PERCENT: Record<JobStatus, number> = {
  queued: 8,
  crawling: 30,
  extracting: 55,
  analyzing: 80,
  done: 100,
  failed: 100,
};

const STEP_LABEL: Record<JobStatus, string> = {
  queued: "Queued",
  crawling: "Crawling",
  extracting: "Extracting",
  analyzing: "Analyzing",
  done: "Done",
  failed: "Failed",
};

const POLL_INTERVAL_MS = 1500;
// A single failed poll (a dropped connection, a transient 500) shouldn't end the flow for a job
// that's still running fine — only give up after several polls in a row fail.
const MAX_CONSECUTIVE_POLL_FAILURES = 5;

export default function AnalyzePage() {
  const params = useParams<{ id: string }>();
  const [job, setJob] = useState<BrandResponse | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let consecutiveFailures = 0;

    async function poll() {
      try {
        const res = await fetch(`/api/brand/${params.id}`);
        if (res.status === 404) {
          if (!cancelled) setFetchError("Job not found.");
          return;
        }
        if (!res.ok) throw new Error(`unexpected status ${res.status}`);

        const body = (await res.json()) as BrandResponse;
        if (cancelled) return;
        consecutiveFailures = 0;
        setJob(body);
        if (body.status !== "done" && body.status !== "failed") {
          timer = setTimeout(poll, POLL_INTERVAL_MS);
        }
      } catch {
        if (cancelled) return;
        consecutiveFailures += 1;
        if (consecutiveFailures >= MAX_CONSECUTIVE_POLL_FAILURES) {
          setFetchError("Lost connection while checking progress.");
          return;
        }
        timer = setTimeout(poll, POLL_INTERVAL_MS);
      }
    }

    void poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [params.id]);

  if (fetchError) {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-6 px-4">
        <p role="alert" className="text-danger">
          {fetchError}
        </p>
        <BackHomeLink />
      </main>
    );
  }

  if (!job) {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-6 px-4">
        <p className="text-ink-muted">Loading…</p>
        <BackHomeLink />
      </main>
    );
  }

  const brandKit = job.status === "done" ? job.brandKit : undefined;
  const logSection = (
    <section className="w-full rounded-2xl bg-paper-well p-4 shadow-well" aria-label="Progress log">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Live log</h2>
      <ul className="mt-3 flex max-h-72 flex-col gap-1 overflow-y-auto text-xs text-ink-muted">
        <AnimatePresence initial={false}>
          {job.logs.map((entry, i) => (
            <motion.li
              key={i}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <span className="font-mono text-ink">[{entry.step}]</span> {entry.message}
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </section>
  );

  if (!brandKit) {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center gap-8 px-4 py-16">
        <BackHomeLink className="self-start" />

        <ProgressDial
          percent={STEP_PERCENT[job.status]}
          label={STEP_LABEL[job.status]}
          failed={job.status === "failed"}
        />

        {job.status === "failed" && (
          <p role="alert" className="text-center text-danger">
            {job.error ?? "Analysis failed."}
          </p>
        )}

        {logSection}
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border-soft/60 bg-paper-raised px-5 py-4 shadow-raised">
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-wide text-ink-muted uppercase">
            Analyzed site
          </p>
          <p className="truncate text-sm font-medium text-ink">{brandKit.brandJson.sourceUrl}</p>
        </div>
        <Link
          href="/"
          className="rounded-full bg-paper-well px-4 py-2 text-sm font-medium text-ink transition-all hover:bg-border-soft active:scale-[0.97]"
        >
          Analyze another site
        </Link>
      </header>

      <BrandKitViewer result={brandKit} />

      {logSection}
    </main>
  );
}
