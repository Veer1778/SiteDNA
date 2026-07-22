import { cn } from "../../lib/utils";

export interface ProgressDialProps {
  /** 0-100 */
  percent: number;
  label: string;
  failed?: boolean;
  className?: string;
}

const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** A circular dial (not a flat bar) — reads as a real gauge/progress ring rather than a bar. */
export function ProgressDial({ percent, label, failed, className }: ProgressDialProps) {
  const clamped = Math.min(100, Math.max(0, percent));
  const offset = CIRCUMFERENCE - (clamped / 100) * CIRCUMFERENCE;

  return (
    <div
      className={cn(
        "relative flex h-40 w-40 items-center justify-center rounded-full border border-border-soft/60 bg-paper-raised shadow-raised",
        className,
      )}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <svg width="120" height="120" viewBox="0 0 120 120" className="-rotate-90">
        <circle
          cx="60"
          cy="60"
          r={RADIUS}
          strokeWidth="10"
          className="fill-none stroke-paper-well"
        />
        <circle
          cx="60"
          cy="60"
          r={RADIUS}
          strokeWidth="10"
          strokeLinecap="round"
          className={cn(
            "fill-none transition-[stroke-dashoffset] duration-500",
            failed ? "stroke-danger" : "stroke-accent",
          )}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="absolute text-sm font-medium text-ink-muted">{label}</span>
    </div>
  );
}
