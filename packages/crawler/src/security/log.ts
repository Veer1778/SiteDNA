/** Structured log event emitted for each meaningful step of a crawl (see `CrawlOptions.onLog`). */
export interface CrawlLogEvent {
  level: "info" | "warn" | "error";
  step: string;
  message: string;
  meta?: Record<string, unknown>;
}

export type CrawlLogger = (event: CrawlLogEvent) => void;

export const noopLogger: CrawlLogger = () => {};
