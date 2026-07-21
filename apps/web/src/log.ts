/**
 * Structured log event, same `{ level, step, message, meta }` shape every pipeline package
 * uses. This is where those callbacks finally get consumed for real: every event from
 * crawler/extractor/vision/brand-engine flows through here during a job run (see `jobs.ts`),
 * written to the server console and appended to the job's persisted `logs`.
 */
export interface AppLogEvent {
  level: "info" | "warn" | "error";
  step: string;
  message: string;
  meta?: Record<string, unknown> | undefined;
}

export type AppLogger = (event: AppLogEvent) => void;

/** Writes a structured line to stdout/stderr — real operational visibility for `pnpm dev`/prod. */
export const consoleLogger: AppLogger = (event) => {
  const line = `[${event.level}] ${event.step}: ${event.message}`;
  if (event.level === "error") {
    console.error(line, event.meta ?? "");
  } else if (event.level === "warn") {
    console.warn(line, event.meta ?? "");
  } else {
    console.log(line, event.meta ?? "");
  }
};
