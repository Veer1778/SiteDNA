"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { BrandKitViewer } from "../../../components/brand-kit/brand-kit-viewer";
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

export default function AnalyzePage() {
  const params = useParams<{ id: string }>();
  const [job, setJob] = useState<BrandResponse | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function poll() {
      try {
        const res = await fetch(`/api/brand/${params.id}`);
        if (!res.ok) {
          if (!cancelled) setFetchError("Job not found.");
          return;
        }
        const body = (await res.json()) as BrandResponse;
        if (cancelled) return;
        setJob(body);
        if (body.status !== "done" && body.status !== "failed") {
          timer = setTimeout(poll, POLL_INTERVAL_MS);
        }
      } catch {
        if (!cancelled) setFetchError("Network error while checking progress.");
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
      <main className="mx-auto flex min-h-screen max-w-2xl items-center justify-center px-4">
        <p role="alert" className="text-danger">
          {fetchError}
        </p>
      </main>
    );
  }

  if (!job) {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl items-center justify-center px-4">
        <p className="text-ink-muted">Loading…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center gap-8 px-4 py-16">
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

      {job.status === "done" && job.brandKit && <BrandKitViewer result={job.brandKit} />}

      <section
        className="w-full rounded-2xl bg-paper-well p-4 shadow-well"
        aria-label="Progress log"
      >
        <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Live log</h2>
        <ul className="mt-3 flex flex-col gap-1 text-xs text-ink-muted">
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
    </main>
  );
}
