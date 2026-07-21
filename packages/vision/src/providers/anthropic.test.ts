import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { VisionResponseValidationError } from "../provider.js";
import type { AnthropicClientLike } from "./anthropic.js";
import { AnthropicVisionProvider } from "./anthropic.js";

const fixturesDir = fileURLToPath(
  new URL("../../examples/fixtures/vision-responses/", import.meta.url),
);

function readFixture(name: string): string {
  return readFileSync(new URL(name, `file://${fixturesDir}`), "utf-8");
}

const VALID = readFixture("valid.json");
const INVALID_BAD_LABEL = readFixture("invalid-bad-label.json");
const NOT_JSON = readFixture("not-json.txt");

function fakeClient(responses: string[]): { client: AnthropicClientLike; calls: number[] } {
  const calls: number[] = [];
  let i = 0;
  const client: AnthropicClientLike = {
    messages: {
      create: async () => {
        calls.push(Date.now());
        const text = responses[Math.min(i, responses.length - 1)]!;
        i += 1;
        return { content: [{ type: "text", text }] };
      },
    },
  };
  return { client, calls };
}

let testImage: { label: string; buffer: Buffer; mimeType: "image/png" };

beforeAll(async () => {
  const buffer = await sharp({
    create: { width: 8, height: 8, channels: 3, background: { r: 10, g: 20, b: 200 } },
  })
    .png()
    .toBuffer();
  testImage = { label: "full-page", buffer, mimeType: "image/png" };
});

describe("AnthropicVisionProvider", () => {
  it("returns a validated classification on the first try, without retrying", async () => {
    const { client, calls } = fakeClient([VALID]);
    const provider = new AnthropicVisionProvider({ client });

    const result = await provider.classify({ images: [testImage] });

    expect(result.spacingDensity).toBe("comfortable");
    expect(calls).toHaveLength(1);
  });

  it("strips markdown code fences defensively", async () => {
    const { client } = fakeClient([`\`\`\`json\n${VALID}\n\`\`\``]);
    const provider = new AnthropicVisionProvider({ client });

    const result = await provider.classify({ images: [testImage] });
    expect(result.spacingDensity).toBe("comfortable");
  });

  it("retries once on invalid JSON and succeeds if the retry is valid", async () => {
    const { client, calls } = fakeClient([NOT_JSON, VALID]);
    const provider = new AnthropicVisionProvider({ client });

    const result = await provider.classify({ images: [testImage] });
    expect(result.spacingDensity).toBe("comfortable");
    expect(calls).toHaveLength(2);
  });

  it("retries once on a schema-invalid response and succeeds if the retry is valid", async () => {
    const { client, calls } = fakeClient([INVALID_BAD_LABEL, VALID]);
    const provider = new AnthropicVisionProvider({ client });

    const result = await provider.classify({ images: [testImage] });
    expect(result.spacingDensity).toBe("comfortable");
    expect(calls).toHaveLength(2);
  });

  it("throws VisionResponseValidationError when both attempts are invalid", async () => {
    const { client, calls } = fakeClient([NOT_JSON, INVALID_BAD_LABEL]);
    const provider = new AnthropicVisionProvider({ client });

    await expect(provider.classify({ images: [testImage] })).rejects.toThrow(
      VisionResponseValidationError,
    );
    expect(calls).toHaveLength(2);
  });

  it("throws a helpful error if no API key and no client are provided", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const provider = new AnthropicVisionProvider({});
    await expect(provider.classify({ images: [testImage] })).rejects.toThrow(/ANTHROPIC_API_KEY/);
    vi.unstubAllEnvs();
  });

  it("logs each meaningful step", async () => {
    const events: string[] = [];
    const { client } = fakeClient([NOT_JSON, VALID]);
    const provider = new AnthropicVisionProvider({ client, onLog: (e) => events.push(e.step) });

    await provider.classify({ images: [testImage] });

    expect(events).toContain("request");
    expect(events).toContain("invalid-response");
    expect(events).toContain("done");
  });
});
