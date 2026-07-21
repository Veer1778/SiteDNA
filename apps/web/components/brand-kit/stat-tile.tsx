import type { ReactNode } from "react";

import { cn } from "../../lib/utils";

export function StatTile({
  label,
  value,
  hint,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 rounded-xl bg-paper-raised px-4 py-3 shadow-raised-sm",
        className,
      )}
    >
      <div className="text-[0.65rem] font-semibold tracking-wide text-ink-muted uppercase">
        {label}
      </div>
      <div className="text-2xl font-semibold text-ink">{value}</div>
      {hint && <div className="text-xs text-ink-muted">{hint}</div>}
    </div>
  );
}
