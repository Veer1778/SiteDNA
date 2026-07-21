import type { InputHTMLAttributes } from "react";

import { cn } from "../../lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-12 w-full rounded-xl border border-border-soft bg-paper-well px-4 text-sm text-ink shadow-well placeholder:text-ink-muted",
        className,
      )}
      {...props}
    />
  );
}
