import { Gauge, Layers, Image as ImageIcon, Palette, Type } from "lucide-react";
import type { ComponentType } from "react";

interface Feature {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

const FEATURES: Feature[] = [
  {
    icon: Palette,
    title: "Color roles",
    description: "Primary, secondary, accent, surface, and more — each with a confidence score.",
  },
  {
    icon: Type,
    title: "Typography",
    description: "Heading and body font stacks, weights, sizes, and line-heights actually in use.",
  },
  {
    icon: ImageIcon,
    title: "Logo & favicon",
    description: "Light, dark, and favicon variants, ranked and detected automatically.",
  },
  {
    icon: Layers,
    title: "Design tokens",
    description: "Spacing, radius, shadow, and animation scales derived from real usage.",
  },
  {
    icon: Gauge,
    title: "Live progress",
    description: "Watch the crawl, extraction, and merge steps happen in real time.",
  },
];

export function FeatureList() {
  return (
    <div className="rounded-2xl bg-paper-raised p-6 shadow-raised">
      <h2 className="font-display text-lg font-semibold text-ink">What you&apos;ll get</h2>
      <ul className="mt-5 flex flex-col gap-5">
        {FEATURES.map(({ icon: Icon, title, description }) => (
          <li key={title} className="flex items-start gap-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-paper-well shadow-well">
              <Icon className="h-5 w-5 text-accent" />
            </span>
            <div>
              <div className="text-sm font-semibold text-ink">{title}</div>
              <div className="mt-0.5 text-sm text-ink-muted">{description}</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
