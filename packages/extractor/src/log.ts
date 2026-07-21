/**
 * Structured log event emitted for each meaningful extraction step (which source a value came
 * from, when a fallback kicked in, guarded fetches attempted/blocked/failed, per-module timing).
 * Mirrors `packages/crawler`'s `CrawlLogEvent`.
 */
export interface ExtractLogEvent {
  level: "info" | "warn" | "error";
  step: string;
  message: string;
  meta?: Record<string, unknown>;
}

export type ExtractLogger = (event: ExtractLogEvent) => void;

export const noopLogger: ExtractLogger = () => {};
