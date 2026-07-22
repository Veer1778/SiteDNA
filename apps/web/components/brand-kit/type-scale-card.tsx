import type { BrandJson } from "@brandkit/shared";

import { Card, CardTitle } from "../ui/card";

/** CSS generic keywords / OS system-font names — not real installable fonts, so there's nothing
 *  useful to fetch from Google Fonts for them. The inline `fontFamily` still uses the site's own
 *  fallback stack, which resolves these correctly on their own. */
const NON_LOADABLE_FAMILIES = new Set([
  "serif",
  "sans-serif",
  "monospace",
  "cursive",
  "fantasy",
  "system-ui",
  "ui-sans-serif",
  "ui-serif",
  "ui-monospace",
  "ui-rounded",
  "-apple-system",
  "blinkmacsystemfont",
  "segoe ui",
  "helvetica neue",
  "helvetica",
  "arial",
]);

/** Best-effort: try to actually load the extracted font from Google Fonts so the preview renders
 *  in the real typeface, not just names it. Silently no-ops (falls back to the declared stack)
 *  for system fonts or families Google Fonts doesn't have — there's no way to know which without
 *  trying, and a failed stylesheet request is harmless. */
function googleFontsHref(family: string, weights: number[]): string | null {
  if (NON_LOADABLE_FAMILIES.has(family.toLowerCase())) return null;
  // CSS font-family values are case-insensitive, so extraction preserves whatever case the site
  // declared (often lowercase, e.g. "inter") — but Google Fonts' family names are conventionally
  // title-cased ("Inter") and its API 404s/503s on a case mismatch. Title-case each word as the
  // best available heuristic; it's exactly right for the vast majority of real family names.
  const titleCased = family
    .split(" ")
    .map((word) => (word.length > 0 ? word[0]!.toUpperCase() + word.slice(1).toLowerCase() : word))
    .join(" ");
  const encodedFamily = encodeURIComponent(titleCased).replace(/%20/g, "+");
  const uniqueWeights = [...new Set(weights)].sort((a, b) => a - b);
  const weightParam = uniqueWeights.length > 0 ? uniqueWeights.join(";") : "400";
  return `https://fonts.googleapis.com/css2?family=${encodedFamily}:wght@${weightParam}&display=swap`;
}

function ScaleRow({
  label,
  roleScale,
}: {
  label: string;
  roleScale: BrandJson["typography"]["heading"];
}) {
  const family = roleScale.families[0];
  const stack = roleScale.families.join(", ");
  const fontsHref = family ? googleFontsHref(family, roleScale.weights) : null;
  const previewSize = Math.min(40, Math.max(...roleScale.sizes, 16));
  const previewWeight = Math.max(...roleScale.weights, 400);

  return (
    <div className="rounded-xl bg-paper-well p-4 shadow-well">
      {fontsHref && <link rel="stylesheet" href={fontsHref} />}
      <div className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{label}</div>
      <div className="mt-1 truncate text-xs text-ink-muted">{family}</div>
      <div
        className="mt-2 truncate text-ink"
        style={{ fontFamily: stack, fontSize: previewSize, fontWeight: previewWeight }}
      >
        The quick brown fox
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-2 text-xs text-ink-muted">
        <div>
          <dt className="font-medium text-ink">Weights</dt>
          <dd>{roleScale.weights.join(", ")}</dd>
        </div>
        <div>
          <dt className="font-medium text-ink">Sizes</dt>
          <dd>{roleScale.sizes.map((s) => `${s}px`).join(", ")}</dd>
        </div>
        <div>
          <dt className="font-medium text-ink">Line height</dt>
          <dd>{roleScale.lineHeights.map((n) => n.toFixed(2)).join(", ")}</dd>
        </div>
      </dl>
    </div>
  );
}

export function TypeScaleCard({ typography }: { typography: BrandJson["typography"] }) {
  return (
    <Card>
      <CardTitle>Typography</CardTitle>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <ScaleRow label="Heading" roleScale={typography.heading} />
        <ScaleRow label="Body" roleScale={typography.body} />
      </div>
    </Card>
  );
}
