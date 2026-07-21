import { type DnsLookup, resolveAndValidateHost } from "@brandkit/crawler";

/**
 * A function that fetches raw bytes for a URL, or `null` if it couldn't/shouldn't be fetched
 * (blocked, timed out, too large, non-2xx). Injectable so tests never need real network access —
 * pass a stub returning canned buffers instead of {@link defaultFetchBytes}.
 */
export type FetchBytes = (url: string, options?: FetchBytesOptions) => Promise<Buffer | null>;

export interface FetchBytesOptions {
  timeoutMs?: number;
  maxBytes?: number;
  /** Test-only escape hatch, forwarded to the crawler's SSRF guard. Never set for real use. */
  allowPrivateNetwork?: boolean;
  dnsLookup?: DnsLookup;
}

const DEFAULT_TIMEOUT_MS = 8_000;
const DEFAULT_MAX_BYTES = 10 * 1024 * 1024;

/**
 * Fetches `url`'s bytes behind `@brandkit/crawler`'s SSRF guard (reused, not duplicated), with a
 * timeout and a size cap. Used for logo/favicon candidate images and asset-classification
 * sampling — bytes the crawl itself didn't already download.
 */
export const defaultFetchBytes: FetchBytes = async (url, options = {}) => {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;

  try {
    await resolveAndValidateHost(
      parsed.hostname,
      options.dnsLookup,
      options.allowPrivateNetwork !== undefined
        ? { allowPrivateNetwork: options.allowPrivateNetwork }
        : {},
    );
  } catch {
    return null;
  }

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    if (!response.ok) return null;
    const contentLength = response.headers.get("content-length");
    if (contentLength && Number(contentLength) > maxBytes) return null;
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength > maxBytes) return null;
    return buffer;
  } catch {
    return null;
  }
};
