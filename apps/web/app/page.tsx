"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { z } from "zod";

import { FeatureList } from "../components/home/feature-list";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";

// A minimal client-side mirror of `src/schema.ts`'s `AnalyzeRequestSchema` shape. Deliberately
// not importing that module here: it pulls in `@brandkit/brand-engine` (and transitively the
// crawler/Playwright chain), which must never end up in the browser bundle. The server route
// still validates with the real `AnalyzeRequestSchema` — this is just a client-side UX check.
const UrlInputSchema = z.object({ url: z.string().url() });

/** Lets users type a bare domain ("spotify.com") instead of requiring "https://" up front. */
function withScheme(input: string): string {
  const trimmed = input.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export default function HomePage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const parsed = UrlInputSchema.safeParse({ url: withScheme(url) });
    if (!parsed.success) {
      setError("Enter a valid URL or domain, e.g. spotify.com");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const body = (await res.json()) as { id?: string; error?: string };
      if (!res.ok || !body.id) {
        setError(body.error ?? "Could not start analysis.");
        setSubmitting(false);
        return;
      }
      router.push(`/analyze/${body.id}`);
    } catch {
      setError("Network error — please try again.");
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto grid min-h-screen max-w-6xl grid-cols-1 items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8">
      <div className="flex flex-col gap-6">
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent-hover shadow-well">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          AI-powered brand extraction
        </span>

        <h1 className="font-display text-5xl font-semibold text-ink sm:text-6xl">BrandKit AI</h1>

        <p className="max-w-md text-lg text-ink-muted">
          Paste a public URL. We&apos;ll crawl it, extract its colors, typography, logo, and tokens,
          and hand you a Brand Kit — live, in your browser.
        </p>

        <form onSubmit={onSubmit} className="flex w-full max-w-md flex-col gap-3 sm:flex-row">
          <Input
            // Plain "text", not "url": the "url" input type enforces a scheme via the browser's
            // own constraint validation before our onSubmit ever runs, which would block a bare
            // domain like "spotify.com" from being submitted at all. We validate ourselves below.
            type="text"
            required
            placeholder="spotify.com or https://example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            aria-label="Website URL"
          />
          <Button type="submit" disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {submitting ? "Starting…" : "Analyze"}
          </Button>
        </form>

        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
      </div>

      <FeatureList />
    </main>
  );
}
