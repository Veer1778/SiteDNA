import type { ComputedStyleProperties, CrawlArtifact } from "@brandkit/crawler";
import type { ColorRoles } from "@brandkit/shared";
import { converter, differenceEuclidean, parse } from "culori";

import { toHex } from "./color-utils.js";
import { type ExtractLogger, noopLogger } from "./log.js";

export interface PaletteSwatch {
  hex: string;
  population: number;
}

/** Subset of a node-vibrant `Palette` we care about — swatch name -> swatch, or `null` if absent. */
export type Palette = Record<string, PaletteSwatch | null>;

export type GetPalette = (buffer: Buffer) => Promise<Palette>;

/** Extracts a palette from the full-page screenshot via node-vibrant. */
export const defaultGetPalette: GetPalette = async (buffer) => {
  const { Vibrant } = await import("node-vibrant/node");
  const raw = await Vibrant.from(buffer).getPalette();
  const palette: Palette = {};
  for (const [name, swatch] of Object.entries(raw)) {
    palette[name] = swatch ? { hex: swatch.hex, population: swatch.population } : null;
  }
  return palette;
};

const toHsl = converter("hsl");
const colorDiff = differenceEuclidean("rgb");
/**
 * Empirical "same color" threshold for culori's `differenceEuclidean("rgb")`, which measures
 * distance in 0-1 (not 0-255) channel space — max possible distance is `sqrt(3) ≈ 1.73`.
 */
const DELTA_E_MERGE_THRESHOLD = 0.12;
/** Below this HSL saturation, a color reads as grayscale and is unfit for primary/secondary/accent. */
const NEUTRAL_SATURATION_THRESHOLD = 0.12;

function isTransparent(cssColor: string): boolean {
  const parsed = parse(cssColor);
  if (!parsed) return true;
  return ("alpha" in parsed ? (parsed.alpha ?? 1) : 1) === 0;
}

function isNeutral(hex: string): boolean {
  const parsed = parse(hex);
  if (!parsed) return true;
  const hsl = toHsl(parsed);
  return (hsl?.s ?? 0) < NEUTRAL_SATURATION_THRESHOLD;
}

function dedupeSwatches(swatches: PaletteSwatch[]): PaletteSwatch[] {
  const sorted = [...swatches].sort((a, b) => b.population - a.population);
  const result: PaletteSwatch[] = [];
  for (const swatch of sorted) {
    if (!result.some((kept) => colorDiff(kept.hex, swatch.hex) < DELTA_E_MERGE_THRESHOLD)) {
      result.push(swatch);
    }
  }
  return result;
}

function styleFor(artifact: CrawlArtifact, selector: string): ComputedStyleProperties | null {
  return artifact.computedStyles.find((entry) => entry.selector === selector)?.styles ?? null;
}

/**
 * Derives {@link ColorRoles} from `artifact`: `background`/`text` from computed `html`/`body`
 * styles (highest confidence, direct signal); `primary`/`secondary`/`accent` from the full-page
 * screenshot's palette (node-vibrant, deduped via culori's Euclidean color distance),
 * cross-checked against button/link/nav computed colors. `success`/`warning`/`danger` are never
 * set — there's no reliable signal for semantic roles at this phase.
 */
export async function extractColors(
  artifact: CrawlArtifact,
  options: { onLog?: ExtractLogger; getPalette?: GetPalette } = {},
): Promise<ColorRoles> {
  const log = options.onLog ?? noopLogger;
  const getPalette = options.getPalette ?? defaultGetPalette;

  const bodyStyle = styleFor(artifact, "body");
  const htmlStyle = styleFor(artifact, "html");
  const buttonStyle = styleFor(artifact, "button");
  const aStyle = styleFor(artifact, "a");
  const navStyle = styleFor(artifact, "nav");
  const inputStyle = styleFor(artifact, "input");

  const roles: ColorRoles = {};

  let backgroundHex: string | null = null;
  let backgroundConfidence = 0;
  for (const style of [bodyStyle, htmlStyle]) {
    if (style && !isTransparent(style.backgroundColor)) {
      const hex = toHex(style.backgroundColor);
      if (hex) {
        backgroundHex = hex;
        backgroundConfidence = 0.95;
        break;
      }
    }
  }

  let textHex: string | null = null;
  if (bodyStyle) textHex = toHex(bodyStyle.color);
  if (!textHex && htmlStyle) textHex = toHex(htmlStyle.color);

  let palette: Palette | null = null;
  try {
    palette = await getPalette(artifact.screenshotFullPage);
  } catch (error) {
    log({
      level: "warn",
      step: "palette",
      message: `palette extraction failed, continuing with CSS-only signals: ${(error as Error).message}`,
    });
  }

  if (!backgroundHex && palette) {
    const fallback = palette.LightMuted ?? palette.LightVibrant ?? palette.Muted ?? null;
    if (fallback) {
      backgroundHex = fallback.hex;
      backgroundConfidence = 0.5;
    }
  }
  if (backgroundHex) roles.background = { hex: backgroundHex, confidence: backgroundConfidence };
  if (textHex) roles.text = { hex: textHex, confidence: 0.9 };

  const excludeHexes = [backgroundHex, textHex].filter((h): h is string => h !== null);
  const paletteSwatches = palette
    ? Object.values(palette).filter((s): s is PaletteSwatch => s !== null)
    : [];
  const candidateSwatches = dedupeSwatches(paletteSwatches)
    .filter((s) => !isNeutral(s.hex))
    .filter((s) => !excludeHexes.some((ex) => colorDiff(s.hex, ex) < DELTA_E_MERGE_THRESHOLD));

  let primaryHex: string | null = null;
  let primaryConfidence = 0;
  for (const style of [buttonStyle, navStyle]) {
    if (style && !isTransparent(style.backgroundColor)) {
      const hex = toHex(style.backgroundColor);
      if (hex && !isNeutral(hex) && hex !== backgroundHex) {
        primaryHex = hex;
        primaryConfidence = 0.85;
        break;
      }
    }
  }
  if (!primaryHex && aStyle) {
    const hex = toHex(aStyle.color);
    if (hex && !isNeutral(hex) && hex !== textHex) {
      primaryHex = hex;
      primaryConfidence = 0.75;
    }
  }
  if (!primaryHex && candidateSwatches[0]) {
    primaryHex = candidateSwatches[0].hex;
    primaryConfidence = 0.55;
  }
  if (
    primaryHex &&
    candidateSwatches.some((s) => colorDiff(s.hex, primaryHex!) < DELTA_E_MERGE_THRESHOLD)
  ) {
    primaryConfidence = Math.min(0.95, primaryConfidence + 0.1);
  }
  if (primaryHex) roles.primary = { hex: primaryHex, confidence: primaryConfidence };

  const remaining = candidateSwatches.filter((s) => s.hex !== primaryHex);
  if (remaining[0]) roles.secondary = { hex: remaining[0].hex, confidence: 0.55 };
  if (remaining[1]) roles.accent = { hex: remaining[1].hex, confidence: 0.5 };

  if (inputStyle) {
    const hex = toHex(inputStyle.borderColor);
    if (hex && hex !== backgroundHex) roles.border = { hex, confidence: 0.7 };
  }

  if (navStyle && !isTransparent(navStyle.backgroundColor)) {
    const hex = toHex(navStyle.backgroundColor);
    if (hex && hex !== backgroundHex && hex !== primaryHex) {
      roles.surface = { hex, confidence: 0.6 };
    }
  }

  log({
    level: "info",
    step: "colors",
    message: `assigned roles: ${Object.keys(roles).join(", ") || "(none)"}`,
  });

  return roles;
}
