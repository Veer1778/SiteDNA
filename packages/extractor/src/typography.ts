import type { ComputedStyleEntry, CrawlArtifact } from "@brandkit/crawler";
import type { TypeScale, Typography } from "@brandkit/shared";

import { parsePx } from "./css-utils.js";
import { type ExtractLogger, noopLogger } from "./log.js";

const HEADING_SELECTORS = new Set(["h1", "h2", "h3", "h4", "h5", "h6"]);
const BODY_SELECTORS = new Set(["body", "p"]);

/** Used when a group (heading or body) has zero usable samples — the schema requires non-empty arrays. */
const FALLBACK_TYPE_SCALE: TypeScale = {
  families: ["system-ui", "sans-serif"],
  weights: [400],
  sizes: [16],
  letterSpacing: [0],
  lineHeights: [1.5],
};

function parseFontFamilies(value: string): string[] {
  return value
    .split(",")
    .map((part) => part.trim().replace(/^["']|["']$/g, ""))
    .filter((part) => part.length > 0);
}

function parseFontWeight(value: string): number | null {
  if (value === "normal") return 400;
  if (value === "bold") return 700;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function uniqueInOrder<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function buildTypeScale(
  entries: ComputedStyleEntry[],
  selectors: Set<string>,
  groupName: string,
  log: ExtractLogger,
): TypeScale {
  const families: string[] = [];
  const weights: number[] = [];
  const sizes: number[] = [];
  const letterSpacing: number[] = [];
  const lineHeights: number[] = [];

  for (const entry of entries) {
    if (!selectors.has(entry.selector) || !entry.styles) continue;
    const { styles } = entry;

    families.push(...parseFontFamilies(styles.fontFamily));

    const weight = parseFontWeight(styles.fontWeight);
    if (weight !== null) weights.push(weight);

    const sizePx = parsePx(styles.fontSize);
    if (sizePx !== null) sizes.push(sizePx);

    if (styles.letterSpacing === "normal") {
      letterSpacing.push(0);
    } else {
      const spacingPx = parsePx(styles.letterSpacing);
      if (spacingPx !== null) letterSpacing.push(spacingPx);
    }

    if (styles.lineHeight === "normal") {
      lineHeights.push(1.2); // browsers' typical default line-height multiplier
    } else {
      const lineHeightPx = parsePx(styles.lineHeight);
      if (lineHeightPx !== null && sizePx !== null && sizePx > 0) {
        lineHeights.push(Math.round((lineHeightPx / sizePx) * 100) / 100);
      }
    }
  }

  if (families.length === 0) {
    log({
      level: "warn",
      step: "typography-fallback",
      message: `no usable computed styles for ${groupName}; using fallback type scale`,
    });
    return FALLBACK_TYPE_SCALE;
  }

  return {
    families: uniqueInOrder(families),
    weights: uniqueInOrder(weights.length > 0 ? weights : FALLBACK_TYPE_SCALE.weights),
    sizes: uniqueInOrder(sizes.length > 0 ? sizes : FALLBACK_TYPE_SCALE.sizes),
    letterSpacing: uniqueInOrder(
      letterSpacing.length > 0 ? letterSpacing : FALLBACK_TYPE_SCALE.letterSpacing,
    ),
    lineHeights: uniqueInOrder(
      lineHeights.length > 0 ? lineHeights : FALLBACK_TYPE_SCALE.lineHeights,
    ),
  };
}

/**
 * Derives {@link Typography} from the crawler's computed-style samples: `h1`-`h6` for the
 * heading group, `body`/`p` for the body group. Falls back to a system-font default for either
 * group if it has zero usable samples.
 */
export function extractTypography(
  artifact: CrawlArtifact,
  options: { onLog?: ExtractLogger } = {},
): Typography {
  const log = options.onLog ?? noopLogger;
  return {
    heading: buildTypeScale(artifact.computedStyles, HEADING_SELECTORS, "heading", log),
    body: buildTypeScale(artifact.computedStyles, BODY_SELECTORS, "body", log),
  };
}
