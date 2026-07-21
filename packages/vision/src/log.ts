/**
 * Structured log event emitted for each meaningful step of a classification run (images
 * prepared/downscaled/capped, request sent, retry-on-invalid, final success/failure, timing).
 * Mirrors `packages/crawler`'s `CrawlLogEvent` / `packages/extractor`'s `ExtractLogEvent`.
 */
export interface VisionLogEvent {
  level: "info" | "warn" | "error";
  step: string;
  message: string;
  meta?: Record<string, unknown>;
}

export type VisionLogger = (event: VisionLogEvent) => void;

export const noopLogger: VisionLogger = () => {};
