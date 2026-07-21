import type { BrandJson } from "@brandkit/shared";

import { Card, CardTitle } from "../ui/card";

function ScaleRow({
  label,
  roleScale,
}: {
  label: string;
  roleScale: BrandJson["typography"]["heading"];
}) {
  return (
    <div className="rounded-xl bg-paper-well p-4 shadow-well">
      <div className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{label}</div>
      <div
        className="mt-2 truncate text-lg text-ink"
        style={{ fontFamily: roleScale.families.join(", ") }}
      >
        {roleScale.families[0]}
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
