"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { z } from "zod";

import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";

// A minimal client-side mirror of `src/schema.ts`'s `AnalyzeRequestSchema` shape. Deliberately
// not importing that module here: it pulls in `@brandkit/brand-engine` (and transitively the
// crawler/Playwright chain), which must never end up in the browser bundle. The server route
// still validates with the real `AnalyzeRequestSchema` — this is just a client-side UX check.
const UrlInputSchema = z.object({ url: z.string().url() });

export default function HomePage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const parsed = UrlInputSchema.safeParse({ url });
    if (!parsed.success) {
      setError("Enter a valid URL, including https://");
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
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-8 px-4">
      <div className="text-center">
        <h1 className="flex items-center justify-center gap-2 text-4xl font-semibold text-ink">
          <Sparkles className="h-7 w-7 text-accent" aria-hidden="true" />
          BrandKit AI
        </h1>
        <p className="mt-3 text-ink-muted">
          Paste a public URL. We&apos;ll crawl it, extract its colors, typography, logo, and tokens,
          and hand you a Brand Kit.
        </p>
      </div>
      <form onSubmit={onSubmit} className="flex w-full flex-col gap-3 sm:flex-row">
        <Input
          type="url"
          required
          placeholder="https://example.com"
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
    </main>
  );
}
