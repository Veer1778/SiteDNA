import type { CrawlArtifact } from "@brandkit/crawler";
import type { Animations, RadiusScale, Shadow, Shadows, SpacingScale } from "@brandkit/shared";
import postcss from "postcss";

import { toHex } from "./color-utils.js";
import { dedupeSorted, parseDurationMs, parsePx, splitTopLevel } from "./css-utils.js";
import { type ExtractLogger, noopLogger } from "./log.js";

const SPACING_PROPS = new Set([
  "margin",
  "margin-top",
  "margin-right",
  "margin-bottom",
  "margin-left",
  "padding",
  "padding-top",
  "padding-right",
  "padding-bottom",
  "padding-left",
  "gap",
  "row-gap",
  "column-gap",
]);

const EASING_PATTERN =
  /ease-in-out|ease-in|ease-out|ease|linear|cubic-bezier\([^)]*\)|steps\([^)]*\)/;

const MAX_SPACING_VALUES = 20;
const MAX_RADIUS_VALUES = 10;

function extractLengthTokens(value: string | undefined): number[] {
  if (!value) return [];
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map(parsePx)
    .filter((n): n is number => n !== null);
}

/**
 * Same as {@link extractLengthTokens}, but drops negative values — for the `spacing` scale
 * specifically, since `SpacingScaleSchema` requires non-negative numbers. Negative margins are a
 * common, valid CSS technique (pulling elements to overlap), but they represent overlap, not a
 * spacing value, so dropping them (rather than taking their absolute value, which would wrongly
 * conflate a 24px gap with a -24px overlap) is the more accurate read of "spacing in use".
 */
function extractSpacingTokens(value: string | undefined): number[] {
  return extractLengthTokens(value).filter((n) => n >= 0);
}

function parseOneShadow(segment: string): Shadow | null {
  let working = segment.trim();
  let inset = false;
  if (/\binset\b/.test(working)) {
    inset = true;
    working = working.replace(/\binset\b/, "").trim();
  }

  const colorMatch = /rgba?\([^)]*\)|#[0-9a-fA-F]{3,8}\b/.exec(working);
  const colorStr = colorMatch ? colorMatch[0] : "rgb(0, 0, 0)";
  if (colorMatch) {
    working = (
      working.slice(0, colorMatch.index) + working.slice(colorMatch.index + colorMatch[0].length)
    ).trim();
  }
  const hex = toHex(colorStr);
  if (!hex) return null;

  const lengths = extractLengthTokens(working);
  if (lengths.length < 2) return null;
  const [offsetX, offsetY, blur = 0, spread = 0] = lengths;

  return {
    offsetX: offsetX!,
    offsetY: offsetY!,
    blur: Math.max(0, blur),
    spread,
    color: hex,
    inset,
  };
}

function parseShadowValue(value: string | undefined): Shadow[] {
  if (!value || value.trim() === "none") return [];
  const shadows: Shadow[] = [];
  for (const segment of splitTopLevel(value)) {
    const shadow = parseOneShadow(segment);
    if (shadow) shadows.push(shadow);
  }
  return shadows;
}

function dedupeShadows(shadows: Shadow[]): Shadow[] {
  const seen = new Map<string, Shadow>();
  for (const shadow of shadows) {
    seen.set(JSON.stringify(shadow), shadow);
  }
  return [...seen.values()];
}

export interface Tokens {
  spacing: SpacingScale;
  radius: RadiusScale;
  shadows: Shadows;
  animations: Animations;
}

/**
 * Derives spacing/radius scales, deduped shadows, and an animation summary from `artifact`.
 * Primary source is the crawler's already-resolved `computedStyles`; PostCSS-parsed
 * stylesheet declarations supplement it for broader coverage (e.g. transition/animation
 * durations, which the crawler doesn't sample via `getComputedStyle`).
 */
export function extractTokens(
  artifact: CrawlArtifact,
  options: { onLog?: ExtractLogger } = {},
): Tokens {
  const log = options.onLog ?? noopLogger;
  const spacingValues: number[] = [];
  const radiusValues: number[] = [];
  let shadows: Shadow[] = [];
  const durations: number[] = [];
  const easings = new Set<string>();

  for (const entry of artifact.computedStyles) {
    if (!entry.styles) continue;
    spacingValues.push(...extractSpacingTokens(entry.styles.padding));
    spacingValues.push(...extractSpacingTokens(entry.styles.margin));
    radiusValues.push(...extractLengthTokens(entry.styles.borderRadius.split("/")[0]));
    shadows.push(...parseShadowValue(entry.styles.boxShadow));
  }

  for (const sheet of artifact.stylesheets) {
    let root;
    try {
      root = postcss.parse(sheet.content);
    } catch (error) {
      log({
        level: "warn",
        step: "tokens-css-parse",
        message: `skipping unparseable stylesheet: ${(error as Error).message}`,
        meta: { href: sheet.href },
      });
      continue;
    }

    root.walkDecls((decl) => {
      const prop = decl.prop.toLowerCase();
      if (SPACING_PROPS.has(prop)) {
        spacingValues.push(...extractSpacingTokens(decl.value));
      } else if (prop === "border-radius" || prop.endsWith("-radius")) {
        radiusValues.push(...extractLengthTokens(decl.value.split("/")[0]));
      } else if (prop === "box-shadow") {
        shadows.push(...parseShadowValue(decl.value));
      } else if (prop === "transition-duration" || prop === "animation-duration") {
        for (const token of splitTopLevel(decl.value)) {
          const ms = parseDurationMs(token);
          if (ms !== null && ms >= 0) durations.push(ms);
        }
      } else if (prop === "transition-timing-function" || prop === "animation-timing-function") {
        for (const part of splitTopLevel(decl.value)) easings.add(part.trim());
      } else if (prop === "transition" || prop === "animation") {
        // The shorthand is `<property> <duration> <timing-function> <delay>` — every
        // time-like token gets parsed here, but `delay` is legitimately negative (starts the
        // transition partway through), while `AnimationsSchema.durations` requires non-negative
        // values. Drop negative tokens rather than mislabeling a delay as a duration.
        for (const part of splitTopLevel(decl.value)) {
          for (const token of part.split(/\s+/)) {
            const ms = parseDurationMs(token);
            if (ms !== null && ms >= 0) durations.push(ms);
          }
          const easingMatch = EASING_PATTERN.exec(part);
          if (easingMatch) easings.add(easingMatch[0]);
        }
      }
    });
  }

  shadows = dedupeShadows(shadows);
  log({
    level: "info",
    step: "tokens",
    message: `derived ${spacingValues.length} spacing samples, ${radiusValues.length} radius samples, ${shadows.length} distinct shadows, ${durations.length} duration samples`,
  });

  return {
    spacing: dedupeSorted(spacingValues).slice(0, MAX_SPACING_VALUES),
    radius: dedupeSorted(radiusValues).slice(0, MAX_RADIUS_VALUES),
    shadows,
    animations: { durations: dedupeSorted(durations), easings: [...easings] },
  };
}
