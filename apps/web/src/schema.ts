import { BrandKitResultSchema } from "@brandkit/brand-engine";
import { z } from "zod";

/** The async job's progress states, in order. `analyzing` is skipped when Vision AI isn't configured. */
export const JobStatusSchema = z.enum([
  "queued",
  "crawling",
  "extracting",
  "analyzing",
  "done",
  "failed",
]);
export type JobStatus = z.infer<typeof JobStatusSchema>;

export const LogEntrySchema = z.object({
  level: z.enum(["info", "warn", "error"]),
  step: z.string(),
  message: z.string(),
  meta: z.record(z.string(), z.unknown()).optional(),
  timestamp: z.string().datetime(),
});
export type LogEntry = z.infer<typeof LogEntrySchema>;

/** One stored asset (e.g. a screenshot) associated with a job, addressable via `GET /assets/:id`. */
export const JobAssetSchema = z.object({
  id: z.string(),
  kind: z.string(),
  contentType: z.string(),
});
export type JobAsset = z.infer<typeof JobAssetSchema>;

/**
 * A job record, as persisted by a `JobStore` and returned (minus internals) by `GET /brand/:id`.
 * `brandKit` is set only once `status === "done"`; `error` only once `status === "failed"`.
 */
export const JobSchema = z.object({
  id: z.string(),
  url: z.string().url(),
  status: JobStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  logs: z.array(LogEntrySchema),
  assets: z.array(JobAssetSchema),
  brandKit: BrandKitResultSchema.optional(),
  error: z.string().optional(),
});
export type Job = z.infer<typeof JobSchema>;

// --- API request/response schemas -----------------------------------------------------------

export const AnalyzeRequestSchema = z.object({ url: z.string().url() });
export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;

export const AnalyzeResponseSchema = z.object({ id: z.string(), status: JobStatusSchema });
export type AnalyzeResponse = z.infer<typeof AnalyzeResponseSchema>;

/** `GET /brand/:id` response — the job doubles as status+result; no separate status endpoint. */
export const BrandResponseSchema = JobSchema.omit({ url: true });
export type BrandResponse = z.infer<typeof BrandResponseSchema>;

export const ComponentsResponseSchema = z.object({
  components: BrandKitResultSchema.shape.brandJson.shape.components,
});
export type ComponentsResponse = z.infer<typeof ComponentsResponseSchema>;

export const ErrorResponseSchema = z.object({ error: z.string() });
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
