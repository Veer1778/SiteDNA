import type { BrandKitResult } from "@brandkit/brand-engine";

import { Badge } from "../ui/badge";
import { ColorSwatchGrid } from "./color-swatch-grid";
import { ComponentsEmptyState } from "./components-empty-state";
import { LogoPreview } from "./logo-preview";
import { TokenScaleRow } from "./token-scale-row";
import { TypeScaleCard } from "./type-scale-card";

export function BrandKitViewer({ result }: { result: BrandKitResult }) {
  const { brandJson, completeness } = result;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-ink">Brand Kit</h2>
        <Badge>{Math.round(completeness.score * 100)}% complete</Badge>
      </div>
      <LogoPreview logo={brandJson.logo} />
      <ColorSwatchGrid colors={brandJson.colors} />
      <TypeScaleCard typography={brandJson.typography} />
      <TokenScaleRow
        spacing={brandJson.spacing}
        radius={brandJson.radius}
        shadows={brandJson.shadows}
      />
      <ComponentsEmptyState components={brandJson.components} />
    </div>
  );
}
