import type { BrandKitResult } from "@brandkit/brand-engine";
import { AlertTriangle, CircleCheck, XCircle } from "lucide-react";

import { Card, CardTitle } from "../ui/card";

/** "colors.surface" -> "Surface color", "logo.dark" -> "Dark logo", "styleClassification" ->
 *  "Style classification" — a readable label from a `Gap.field` path. */
function humanizeField(field: string): string {
  const [head, tail] = field.split(".");
  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  if (tail) {
    const noun = head === "colors" ? "color" : head === "logo" ? "logo" : head;
    return `${capitalize(tail)} ${noun}`;
  }
  // Split "styleClassification" -> "style Classification" -> "Style classification"
  const spaced = head!.replace(/([A-Z])/g, " $1").toLowerCase();
  return capitalize(spaced.trim());
}

export function GapsCard({ completeness }: { completeness: BrandKitResult["completeness"] }) {
  return (
    <Card>
      <CardTitle>Gaps</CardTitle>
      {completeness.gaps.length === 0 ? (
        <div className="mt-3 flex items-center gap-2 text-sm text-ink-muted">
          <CircleCheck className="h-4 w-4 text-success" aria-hidden="true" />
          Nothing missing — every scored field was detected with good confidence.
        </div>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {completeness.gaps.map((gap) => {
            const isMissing = gap.severity === "missing";
            const Icon = isMissing ? XCircle : AlertTriangle;
            return (
              <li key={gap.field} className="flex items-start gap-3">
                <Icon
                  className={`mt-0.5 h-4 w-4 shrink-0 ${isMissing ? "text-danger" : "text-accent-hover"}`}
                  aria-hidden="true"
                />
                <div>
                  <div className="text-sm font-medium text-ink">{humanizeField(gap.field)}</div>
                  <div className="text-xs text-ink-muted">{gap.message}</div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
