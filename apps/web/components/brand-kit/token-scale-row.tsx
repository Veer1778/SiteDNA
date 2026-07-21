import type { BrandJson } from "@brandkit/shared";

import { Card, CardTitle } from "../ui/card";

export function TokenScaleRow({
  spacing,
  radius,
  shadows,
}: {
  spacing: BrandJson["spacing"];
  radius: BrandJson["radius"];
  shadows: BrandJson["shadows"];
}) {
  return (
    <Card>
      <CardTitle>Tokens</CardTitle>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <div className="text-xs font-medium text-ink-muted">Spacing</div>
          <div className="mt-2 flex flex-wrap items-end gap-1">
            {spacing.length === 0 ? (
              <span className="text-xs text-ink-muted">None detected</span>
            ) : (
              spacing.map((px, i) => (
                <div
                  key={i}
                  className="rounded bg-accent-soft shadow-well"
                  style={{ width: Math.max(4, px), height: 10 }}
                  title={`${px}px`}
                />
              ))
            )}
          </div>
        </div>
        <div>
          <div className="text-xs font-medium text-ink-muted">Radius</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {radius.length === 0 ? (
              <span className="text-xs text-ink-muted">None detected</span>
            ) : (
              radius.map((px, i) => (
                <div
                  key={i}
                  className="h-8 w-8 border border-border-soft bg-paper-well shadow-well"
                  style={{ borderRadius: px }}
                  title={`${px}px`}
                />
              ))
            )}
          </div>
        </div>
        <div>
          <div className="text-xs font-medium text-ink-muted">Shadows</div>
          <div className="mt-2 flex flex-wrap gap-3">
            {shadows.length === 0 ? (
              <span className="text-xs text-ink-muted">None detected</span>
            ) : (
              shadows.slice(0, 4).map((shadow, i) => (
                <div
                  key={i}
                  className="h-10 w-10 rounded-md bg-paper-raised"
                  style={{
                    boxShadow: `${shadow.inset ? "inset " : ""}${shadow.offsetX}px ${shadow.offsetY}px ${shadow.blur}px ${shadow.spread}px ${shadow.color}`,
                  }}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
