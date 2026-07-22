import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { cn } from "../../lib/utils";

export function BackHomeLink({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn(
        "inline-flex items-center gap-2 self-start rounded-full bg-paper-well px-4 py-2 text-sm font-medium text-ink transition-all hover:bg-border-soft active:scale-[0.97]",
        className,
      )}
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      Back to home
    </Link>
  );
}
