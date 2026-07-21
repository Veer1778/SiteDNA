/**
 * Structured log event emitted for each meaningful step of a merge run (which source a field
 * came from, each asset refinement applied/skipped, final completeness score). Mirrors
 * `packages/crawler`/`packages/extractor`/`packages/vision`'s loggers.
 */
export interface MergeLogEvent {
  level: "info" | "warn" | "error";
  step: string;
  message: string;
  meta?: Record<string, unknown>;
}

export type MergeLogger = (event: MergeLogEvent) => void;

export const noopLogger: MergeLogger = () => {};
