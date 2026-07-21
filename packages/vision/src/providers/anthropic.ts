import { type VisionLogger, noopLogger } from "../log.js";
import { prepareImages } from "../prepare-images.js";
import { buildPrompt, buildRetryPrompt } from "../prompt.js";
import type { VisionImage, VisionInput, VisionProvider } from "../provider.js";
import { VisionResponseValidationError } from "../provider.js";
import { type VisionClassification, VisionClassificationSchema } from "../schema.js";

export const DEFAULT_MODEL = "claude-sonnet-5";
const DEFAULT_MAX_TOKENS = 1536;

interface AnthropicImageBlock {
  type: "image";
  source: { type: "base64"; media_type: VisionImage["mimeType"]; data: string };
}
interface AnthropicTextBlock {
  type: "text";
  text: string;
}

/**
 * The minimal shape of `@anthropic-ai/sdk`'s `Anthropic` client this provider needs —
 * lets tests inject a fake client instead of the real SDK, so no test ever makes a live API
 * call. Structurally compatible with the real `Anthropic` instance.
 */
export interface AnthropicClientLike {
  messages: {
    create(params: {
      model: string;
      max_tokens: number;
      messages: Array<{ role: "user"; content: Array<AnthropicImageBlock | AnthropicTextBlock> }>;
    }): Promise<{ content: Array<{ type: string; text?: string }> }>;
  };
}

export interface AnthropicVisionProviderOptions {
  /** Defaults to `process.env.ANTHROPIC_API_KEY`. Only read if `client` isn't provided. */
  apiKey?: string;
  /** Defaults to `process.env.VISION_MODEL ?? DEFAULT_MODEL`. */
  model?: string;
  /** Injectable client, for tests. Defaults to a real `@anthropic-ai/sdk` client, built lazily. */
  client?: AnthropicClientLike;
  maxImages?: number;
  maxDimension?: number;
  maxTokens?: number;
  onLog?: VisionLogger;
}

function buildContent(
  images: VisionImage[],
  promptText: string,
): Array<AnthropicImageBlock | AnthropicTextBlock> {
  return [
    ...images.map((image): AnthropicImageBlock => ({
      type: "image",
      source: { type: "base64", media_type: image.mimeType, data: image.buffer.toString("base64") },
    })),
    { type: "text", text: promptText },
  ];
}

function parseJsonResponse(
  text: string,
): { success: true; data: unknown } | { success: false; error: string } {
  // Strip markdown code fences defensively, in case the model wraps its output despite instructions.
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\r?\n?/, "")
    .replace(/\r?\n?```$/, "");
  try {
    return { success: true, data: JSON.parse(cleaned) };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

/**
 * The concrete `VisionProvider`: sends the (downscaled, capped) screenshots to Claude with a
 * JSON-only prompt, validates the response against `VisionClassificationSchema`, and retries
 * once with a corrective prompt on failure before giving up.
 */
export class AnthropicVisionProvider implements VisionProvider {
  private readonly model: string;
  private readonly apiKey: string | undefined;
  private readonly maxImages: number | undefined;
  private readonly maxDimension: number | undefined;
  private readonly maxTokens: number;
  private readonly log: VisionLogger;
  private injectedClient: AnthropicClientLike | undefined;
  private lazyClient: AnthropicClientLike | undefined;

  constructor(options: AnthropicVisionProviderOptions = {}) {
    this.model = options.model ?? process.env.VISION_MODEL ?? DEFAULT_MODEL;
    this.apiKey = options.apiKey ?? process.env.ANTHROPIC_API_KEY;
    this.maxImages = options.maxImages;
    this.maxDimension = options.maxDimension;
    this.maxTokens = options.maxTokens ?? DEFAULT_MAX_TOKENS;
    this.log = options.onLog ?? noopLogger;
    this.injectedClient = options.client;
  }

  private async getClient(): Promise<AnthropicClientLike> {
    if (this.injectedClient) return this.injectedClient;
    if (!this.lazyClient) {
      if (!this.apiKey) {
        throw new Error(
          "ANTHROPIC_API_KEY is not set (and no client was injected). Set it in the environment or pass { apiKey } / { client }.",
        );
      }
      const { default: Anthropic } = await import("@anthropic-ai/sdk");
      this.lazyClient = new Anthropic({ apiKey: this.apiKey }) as unknown as AnthropicClientLike;
    }
    return this.lazyClient;
  }

  private async callModel(
    client: AnthropicClientLike,
    content: Array<AnthropicImageBlock | AnthropicTextBlock>,
  ): Promise<string> {
    const response = await client.messages.create({
      model: this.model,
      max_tokens: this.maxTokens,
      messages: [{ role: "user", content }],
    });
    const textBlock = response.content.find((block) => block.type === "text");
    return textBlock?.text ?? "";
  }

  async classify(input: VisionInput): Promise<VisionClassification> {
    const prepareOptions: Parameters<typeof prepareImages>[1] = { onLog: this.log };
    if (this.maxImages !== undefined) prepareOptions.maxImages = this.maxImages;
    if (this.maxDimension !== undefined) prepareOptions.maxDimension = this.maxDimension;
    const images = await prepareImages(input.images, prepareOptions);

    const promptContext: Parameters<typeof buildPrompt>[0] = {};
    if (input.assetCandidates !== undefined) promptContext.assetCandidates = input.assetCandidates;
    if (input.logoCandidates !== undefined) promptContext.logoCandidates = input.logoCandidates;
    const prompt = buildPrompt(promptContext);
    const client = await this.getClient();

    this.log({
      level: "info",
      step: "request",
      message: `sending ${images.length} image(s) to ${this.model}`,
    });

    let responseText = await this.callModel(client, buildContent(images, prompt));
    let validated = this.validate(responseText);

    if (!validated.success) {
      this.log({
        level: "warn",
        step: "invalid-response",
        message: "response failed validation, retrying once",
        meta: { error: validated.error },
      });
      const retryPrompt = buildRetryPrompt(responseText, validated.error);
      responseText = await this.callModel(client, buildContent(images, retryPrompt));
      validated = this.validate(responseText);

      if (!validated.success) {
        this.log({
          level: "error",
          step: "invalid-response-final",
          message: "response failed validation after retry",
          meta: { error: validated.error },
        });
        throw new VisionResponseValidationError(
          `vision provider response failed schema validation after one retry: ${validated.error}`,
        );
      }
    }

    this.log({ level: "info", step: "done", message: "classification succeeded" });
    return validated.data;
  }

  private validate(
    responseText: string,
  ): { success: true; data: VisionClassification } | { success: false; error: string } {
    const parsedJson = parseJsonResponse(responseText);
    if (!parsedJson.success) {
      return { success: false, error: `invalid JSON: ${parsedJson.error}` };
    }
    const result = VisionClassificationSchema.safeParse(parsedJson.data);
    if (!result.success) {
      return { success: false, error: result.error.message };
    }
    return { success: true, data: result.data };
  }
}
