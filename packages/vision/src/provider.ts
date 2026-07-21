import type { VisionAssetClassification, VisionClassification } from "./schema.js";

/** One image to classify. `label` is a short description (e.g. "full-page screenshot"). */
export interface VisionImage {
  label: string;
  buffer: Buffer;
  mimeType: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
}

/** An asset from Phase 2's extractor, offered for vision to confirm or correct. */
export interface AssetCandidate {
  url: string;
  currentClassification: VisionAssetClassification;
}

/** A logo candidate from Phase 2's extractor, offered for vision to confirm or correct. */
export interface LogoCandidate {
  url: string;
  score: number;
}

export interface VisionInput {
  images: VisionImage[];
  /** Phase 2's current asset classifications, for vision to refine — omit if unavailable. */
  assetCandidates?: AssetCandidate[];
  /** Phase 2's ranked logo candidates, for vision to refine — omit if unavailable. */
  logoCandidates?: LogoCandidate[];
}

/** Thrown when a provider's response never validates against `VisionClassificationSchema`, even after the one retry. */
export class VisionResponseValidationError extends Error {}

/**
 * Provider-agnostic interface for classifying a site's visual identity from screenshots.
 * `packages/vision` ships one concrete implementation (`AnthropicVisionProvider`,
 * `src/providers/anthropic.ts`) and one test double (`FakeVisionProvider`,
 * `src/providers/fake.ts`).
 */
export interface VisionProvider {
  classify(input: VisionInput): Promise<VisionClassification>;
}
