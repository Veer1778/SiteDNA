import {
  extendZodWithOpenApi,
  OpenApiGeneratorV3,
  OpenAPIRegistry,
} from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

import {
  AnalyzeRequestSchema,
  AnalyzeResponseSchema,
  BrandResponseSchema,
  ComponentsResponseSchema,
  ErrorResponseSchema,
} from "./schema";

// Patches ZodType's prototype with `.openapi()`, which the generator calls internally even on
// schemas that never call it themselves — must run before generateOpenApiDocument() is called.
extendZodWithOpenApi(z);

/**
 * Builds the OpenAPI 3.0 document from the same Zod schemas the routes validate against — no
 * hand-maintained duplicate schema. Not `@hono/zod-openapi` (which requires zod v4; every
 * schema in this monorepo, including `packages/shared`'s `BrandJsonSchema`, is zod v3) —
 * `@asteasolutions/zod-to-openapi` v7 supports zod v3 and doesn't require Hono's
 * route-definition wrapper.
 */
export function generateOpenApiDocument() {
  const registry = new OpenAPIRegistry();
  const idParam = z.object({ id: z.string() });

  registry.registerPath({
    method: "post",
    path: "/api/analyze",
    description: "Starts an async brand-extraction job for a URL.",
    request: { body: { content: { "application/json": { schema: AnalyzeRequestSchema } } } },
    responses: {
      202: {
        description: "Job created",
        content: { "application/json": { schema: AnalyzeResponseSchema } },
      },
      429: {
        description: "Rate limited",
        content: { "application/json": { schema: ErrorResponseSchema } },
      },
    },
  });

  registry.registerPath({
    method: "get",
    path: "/api/brand/{id}",
    description:
      'Returns a job\'s status, and its Brand Kit once status is "done" (or its error once "failed"). Doubles as the job-status endpoint — there is no separate one.',
    request: { params: idParam },
    responses: {
      200: {
        description: "Job status/result",
        content: { "application/json": { schema: BrandResponseSchema } },
      },
      404: {
        description: "Job not found",
        content: { "application/json": { schema: ErrorResponseSchema } },
      },
    },
  });

  registry.registerPath({
    method: "get",
    path: "/api/assets/{id}",
    description: "Streams a stored asset (e.g. a full-page or viewport screenshot) by id.",
    request: { params: idParam },
    responses: {
      200: { description: "Asset bytes" },
      404: {
        description: "Asset not found",
        content: { "application/json": { schema: ErrorResponseSchema } },
      },
    },
  });

  registry.registerPath({
    method: "get",
    path: "/api/components/{id}",
    description:
      "Returns a job's detected UI components. Currently always [] — no phase implements component detection yet.",
    request: { params: idParam },
    responses: {
      200: {
        description: "Components",
        content: { "application/json": { schema: ComponentsResponseSchema } },
      },
      404: {
        description: "Job not found",
        content: { "application/json": { schema: ErrorResponseSchema } },
      },
    },
  });

  const generator = new OpenApiGeneratorV3(registry.definitions);
  return generator.generateDocument({
    openapi: "3.0.0",
    info: { title: "BrandKit AI API", version: "0.1.0" },
  });
}
