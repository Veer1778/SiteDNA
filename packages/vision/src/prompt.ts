import { DesignLanguageLabelSchema } from "@brandkit/shared";

import type { AssetCandidate, LogoCandidate } from "./provider.js";
import { VisionAssetClassificationSchema } from "./schema.js";

const DESIGN_LANGUAGE_LABELS = DesignLanguageLabelSchema.options.join('", "');
const ASSET_CLASSIFICATIONS = VisionAssetClassificationSchema.options.join('", "');

const JSON_SHAPE = `{
  "styleClassification": [{ "label": "<one of: "${DESIGN_LANGUAGE_LABELS}">", "score": <0-1> }, ...],
  "voice": ["<short brand personality/voice descriptor>", ...],
  "photographyStyle": ["<short descriptor>", ...],
  "illustrationStyle": ["<short descriptor>", ...],
  "spacingDensity": "compact" | "comfortable" | "spacious",
  "animationStyle": ["<short descriptor>", ...],
  "assetRefinements": [{ "url": "<asset url>", "suggestedClassification": "<one of: "${ASSET_CLASSIFICATIONS}">", "confidence": <0-1>, "reason": "<short reason>" }, ...],
  "logoRefinement": null | { "suggestedLogoUrl": "<url>", "reason": "<short reason>" }
}`;

function formatAssetCandidates(candidates: AssetCandidate[] | undefined): string {
  if (!candidates || candidates.length === 0) {
    return "No asset candidates were provided — return an empty assetRefinements array.";
  }
  const lines = candidates
    .map((c) => `- ${c.url} (currently classified: ${c.currentClassification})`)
    .join("\n");
  return `Confirm or correct these asset classifications, one entry per asset you have an opinion on:\n${lines}`;
}

function formatLogoCandidates(candidates: LogoCandidate[] | undefined): string {
  if (!candidates || candidates.length === 0) {
    return "No logo candidates were provided — return logoRefinement: null.";
  }
  const lines = candidates.map((c) => `- ${c.url} (heuristic score: ${c.score})`).join("\n");
  return `Here is the current best-guess logo, ranked by a CSS/HTML heuristic (highest score first). If you agree it's the site's actual logo, return logoRefinement: null. If a better candidate is visible in the screenshots, suggest it:\n${lines}`;
}

/**
 * Builds the initial classification prompt: the images (referenced by label, sent separately as
 * image content blocks) plus the exact JSON shape required and any Phase 2 candidates to refine.
 */
export function buildPrompt(context: {
  assetCandidates?: AssetCandidate[];
  logoCandidates?: LogoCandidate[];
}): string {
  return `You are classifying a website's visual identity from the attached screenshot(s).

Respond with ONLY a single JSON object matching this exact shape — no prose, no markdown code
fences, nothing before or after the JSON:

${JSON_SHAPE}

${formatAssetCandidates(context.assetCandidates)}

${formatLogoCandidates(context.logoCandidates)}`;
}

/** Builds a corrective follow-up prompt after a response failed schema validation. */
export function buildRetryPrompt(previousResponseText: string, validationError: string): string {
  return `Your previous response did not match the required JSON shape.

Your response was:
${previousResponseText}

Validation error:
${validationError}

Respond again with ONLY a single JSON object matching the required shape — no prose, no markdown
code fences, nothing before or after the JSON.`;
}
