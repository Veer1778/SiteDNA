import type { VisionInput, VisionProvider } from "../provider.js";
import type { VisionClassification } from "../schema.js";

/**
 * A `VisionProvider` that returns a fixed, caller-supplied classification — no network, no
 * API key. Used by every test in this package (and intended for `brand-engine`'s tests, once
 * that exists) instead of `AnthropicVisionProvider`.
 */
export class FakeVisionProvider implements VisionProvider {
  constructor(private readonly response: VisionClassification) {}

  async classify(_input: VisionInput): Promise<VisionClassification> {
    return this.response;
  }
}
