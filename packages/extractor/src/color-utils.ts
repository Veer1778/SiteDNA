import { formatHex, parse } from "culori";

/**
 * Normalizes any CSS color string (`rgb()`, `rgba()`, hex, named color, ...) culori can parse
 * to a lowercase 6-digit hex string (alpha is dropped — none of our color schemas carry alpha).
 * Returns `null` for anything culori can't parse.
 */
export function toHex(cssColor: string): string | null {
  const parsed = parse(cssColor);
  if (!parsed) return null;
  return formatHex(parsed) ?? null;
}
