import type { BrandKitResult } from "@brandkit/brand-engine";

import { Badge } from "../ui/badge";
import { ColorSwatchGrid } from "./color-swatch-grid";
import { ComponentsEmptyState } from "./components-empty-state";
import { GapsCard } from "./gaps-card";
import { LogoPreview } from "./logo-preview";
import { StatTile } from "./stat-tile";
import { AnimationsCard, RadiusCard, ShadowsCard, SpacingCard } from "./token-scale-row";
import { TypeScaleCard } from "./type-scale-card";

// Matches CORE_COLOR_ROLES in packages/brand-engine/src/completeness.ts: success/warning/danger
// are excluded from scoring (app-UI conventions most marketing sites don't have), so this stat
// only counts the 7 roles that are actually scored, not all 10 in ColorRolesSchema.
const CORE_COLOR_ROLE_COUNT = 7;
const LOGO_SLOT_COUNT = 3;

export function BrandKitViewer({ result }: { result: BrandKitResult }) {
  const { brandJson, completeness } = result;
  const coreColorsFound = (
    ["primary", "secondary", "accent", "surface", "background", "text", "border"] as const
  ).filter((role) => brandJson.colors[role] !== undefined).length;
  const logoVariantsFound = Object.values(brandJson.logo).filter(Boolean).length;
  const tokenCount =
    brandJson.spacing.length +
    brandJson.radius.length +
    brandJson.shadows.length +
    brandJson.animations.durations.length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-xl font-semibold text-ink">Brand Kit</h2>
        <Badge>{Math.round(completeness.score * 100)}% complete</Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile
          label="Completeness"
          value={`${Math.round(completeness.score * 100)}%`}
          hint={`${completeness.gaps.length} gap${completeness.gaps.length === 1 ? "" : "s"}`}
        />
        <StatTile
          label="Colors"
          value={`${coreColorsFound}/${CORE_COLOR_ROLE_COUNT}`}
          hint="roles found"
        />
        <StatTile
          label="Logo"
          value={`${logoVariantsFound}/${LOGO_SLOT_COUNT}`}
          hint="variants found"
        />
        <StatTile label="Tokens" value={tokenCount} hint="spacing/radius/shadow/duration values" />
      </div>

      <GapsCard completeness={completeness} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <LogoPreview logo={brandJson.logo} />
        </div>
        <div className="lg:col-span-2">
          <ColorSwatchGrid colors={brandJson.colors} />
        </div>
      </div>

      <TypeScaleCard typography={brandJson.typography} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SpacingCard spacing={brandJson.spacing} />
        <RadiusCard radius={brandJson.radius} />
        <ShadowsCard shadows={brandJson.shadows} />
        <AnimationsCard animations={brandJson.animations} />
      </div>

      <ComponentsEmptyState components={brandJson.components} />
    </div>
  );
}
