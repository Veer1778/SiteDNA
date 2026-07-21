export type {
  AssetCandidate,
  LogoCandidate,
  VisionImage,
  VisionInput,
  VisionProvider,
} from "./provider.js";
export { VisionResponseValidationError } from "./provider.js";

export * from "./schema.js";

export type { PrepareImagesOptions } from "./prepare-images.js";
export { DEFAULT_MAX_DIMENSION, DEFAULT_MAX_IMAGES, prepareImages } from "./prepare-images.js";

export { buildPrompt, buildRetryPrompt } from "./prompt.js";

export type { AnthropicClientLike, AnthropicVisionProviderOptions } from "./providers/anthropic.js";
export { AnthropicVisionProvider, DEFAULT_MODEL } from "./providers/anthropic.js";
export { FakeVisionProvider } from "./providers/fake.js";

export type { ClassifyFromCrawlArtifactOptions } from "./from-crawl-artifact.js";
export { classifyFromCrawlArtifact } from "./from-crawl-artifact.js";

export type { VisionLogEvent, VisionLogger } from "./log.js";

/**
 * Package identity, used by tooling (CI, dependency-cruiser) to confirm the package builds and
 * is importable.
 */
export const PACKAGE_NAME = "@brandkit/vision" as const;
