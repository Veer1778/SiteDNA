import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";

import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-full font-medium shadow-raised-sm transition-all active:scale-[0.97] active:shadow-pressed disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        // A real gradient (not just a flat fill) plus the inset top highlight from
        // shadow-raised-sm reads as a glossy raised pill, not a flat black rectangle.
        primary:
          "bg-gradient-to-b from-[#3a3a3c] to-black text-white hover:from-[#48484a] hover:to-[#1d1d1f]",
        secondary: "bg-paper-well text-ink hover:bg-border-soft",
      },
      size: {
        default: "h-11 px-6 text-sm",
        lg: "h-13 px-8 text-base",
      },
    },
    defaultVariants: { variant: "primary", size: "default" },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
