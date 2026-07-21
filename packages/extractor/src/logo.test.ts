import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { extractLogo } from "./logo.js";
import { makeArtifact } from "./test-utils.js";

async function pngBuffer(rgb: { r: number; g: number; b: number }): Promise<Buffer> {
  return sharp({ create: { width: 16, height: 16, channels: 3, background: rgb } })
    .png()
    .toBuffer();
}

describe("extractLogo", () => {
  it("picks the img nearest header/nav with a logo-ish hint, and buckets by luminance", async () => {
    const darkLogo = await pngBuffer({ r: 10, g: 10, b: 10 });
    const artifact = makeArtifact({
      html: `<!doctype html><html><body>
        <nav><img src="/logo.png" alt="Acme logo" /></nav>
        <img src="/unrelated.png" alt="hero" />
      </body></html>`,
      finalUrl: "https://example.test/",
    });

    const logo = await extractLogo(artifact, {
      fetchBytes: async (url) => (url === "https://example.test/logo.png" ? darkLogo : null),
    });

    expect(logo.light).toBeDefined();
    expect(logo.light?.url).toBe("https://example.test/logo.png");
    expect(logo.light?.width).toBe(16);
    expect(logo.dark).toBeUndefined();
  });

  it("assigns a light-colored (high luminance) logo to the dark slot", async () => {
    const lightLogo = await pngBuffer({ r: 250, g: 250, b: 250 });
    const artifact = makeArtifact({
      html: `<nav><img src="/logo.png" class="site-logo" /></nav>`,
      finalUrl: "https://example.test/",
    });

    const logo = await extractLogo(artifact, {
      fetchBytes: async () => lightLogo,
    });

    expect(logo.dark).toBeDefined();
    expect(logo.light).toBeUndefined();
  });

  it("falls back to og:image when there is no img candidate", async () => {
    const image = await pngBuffer({ r: 20, g: 40, b: 200 });
    const artifact = makeArtifact({
      html: `<meta property="og:image" content="/social.png" />`,
      finalUrl: "https://example.test/",
    });

    const logo = await extractLogo(artifact, {
      fetchBytes: async (url) => (url === "https://example.test/social.png" ? image : null),
    });

    expect(logo.light ?? logo.dark).toBeDefined();
  });

  it("picks the best favicon candidate by rel/sizes", async () => {
    const icon = await pngBuffer({ r: 0, g: 0, b: 0 });
    const artifact = makeArtifact({
      faviconCandidates: [
        { url: "https://example.test/favicon-16.png", rel: "icon", sizes: "16x16" },
        { url: "https://example.test/favicon-192.png", rel: "icon", sizes: "192x192" },
      ],
    });

    const logo = await extractLogo(artifact, {
      fetchBytes: async (url) => (url === "https://example.test/favicon-192.png" ? icon : null),
    });

    expect(logo.favicon?.url).toBe("https://example.test/favicon-192.png");
  });

  it("returns an empty Logo when nothing can be found or fetched, without throwing", async () => {
    const artifact = makeArtifact({ html: "<html><body>no images here</body></html>" });
    const logo = await extractLogo(artifact, { fetchBytes: async () => null });

    expect(logo).toEqual({});
  });
});
