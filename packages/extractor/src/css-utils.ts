/** Parses a computed-style pixel length like `"12px"` to `12`; `null` if not a plain px value. */
export function parsePx(value: string): number | null {
  const match = /^(-?\d+(?:\.\d+)?)px$/.exec(value.trim());
  return match ? Number(match[1]) : null;
}

/** Parses a duration like `"300ms"` or `"0.3s"` to milliseconds; `null` if unparseable. */
export function parseDurationMs(value: string): number | null {
  const trimmed = value.trim();
  const ms = /^(-?\d+(?:\.\d+)?)ms$/.exec(trimmed);
  if (ms) return Number(ms[1]);
  const s = /^(-?\d+(?:\.\d+)?)s$/.exec(trimmed);
  if (s) return Number(s[1]) * 1000;
  return null;
}

/** Splits a CSS value list on top-level commas only — commas inside `(...)` don't split. */
export function splitTopLevel(value: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const char of value) {
    if (char === "(") depth += 1;
    if (char === ")") depth -= 1;
    if (char === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

/** De-duplicates and sorts a list of numbers ascending. */
export function dedupeSorted(values: number[]): number[] {
  return [...new Set(values)].sort((a, b) => a - b);
}
