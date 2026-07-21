import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { prepareImages } from "./prepare-images.js";
import type { VisionImage } from "./provider.js";

async function makeImage(label: string, width: number, height: number): Promise<VisionImage> {
  const buffer = await sharp({
    create: { width, height, channels: 3, background: { r: 10, g: 20, b: 200 } },
  })
    .png()
    .toBuffer();
  return { label, buffer, mimeType: "image/png" };
}

describe("prepareImages", () => {
  it("downscales an oversized image to the max dimension and re-encodes as JPEG", async () => {
    const big = await makeImage("full-page", 2000, 3000);
    const [prepared] = await prepareImages([big], { maxDimension: 1024 });

    expect(prepared?.mimeType).toBe("image/jpeg");
    const metadata = await sharp(prepared!.buffer).metadata();
    expect(Math.max(metadata.width ?? 0, metadata.height ?? 0)).toBeLessThanOrEqual(1024);
  });

  it("never enlarges an already-small image", async () => {
    const small = await makeImage("viewport", 100, 80);
    const [prepared] = await prepareImages([small], { maxDimension: 1024 });

    const metadata = await sharp(prepared!.buffer).metadata();
    expect(metadata.width).toBeLessThanOrEqual(100);
    expect(metadata.height).toBeLessThanOrEqual(80);
  });

  it("caps the number of images sent, dropping the rest", async () => {
    const images = await Promise.all([
      makeImage("a", 64, 64),
      makeImage("b", 64, 64),
      makeImage("c", 64, 64),
      makeImage("d", 64, 64),
      makeImage("e", 64, 64),
    ]);

    const prepared = await prepareImages(images, { maxImages: 3 });

    expect(prepared).toHaveLength(3);
    expect(prepared.map((p) => p.label)).toEqual(["a", "b", "c"]);
  });

  it("logs when images are capped or downscaled", async () => {
    const events: string[] = [];
    const images = await Promise.all([
      makeImage("a", 2000, 2000),
      makeImage("b", 64, 64),
      makeImage("c", 64, 64),
      makeImage("d", 64, 64),
    ]);

    await prepareImages(images, {
      maxImages: 2,
      onLog: (event) => events.push(event.step),
    });

    expect(events).toContain("prepare-images-cap");
    expect(events).toContain("prepare-images-downscale");
  });
});
