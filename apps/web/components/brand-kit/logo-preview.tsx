import type { BrandJson } from "@brandkit/shared";

import { Card, CardTitle } from "../ui/card";

const VARIANTS: Array<{ key: keyof BrandJson["logo"]; label: string }> = [
  { key: "light", label: "Light" },
  { key: "dark", label: "Dark" },
  { key: "favicon", label: "Favicon" },
];

export function LogoPreview({ logo }: { logo: BrandJson["logo"] }) {
  const found = VARIANTS.filter((v) => logo[v.key] !== undefined);

  return (
    <Card>
      <CardTitle>Logo</CardTitle>
      {found.length === 0 ? (
        <p className="mt-3 text-sm text-ink-muted">No logo candidates were found.</p>
      ) : (
        <div className="mt-4 flex flex-wrap gap-4">
          {found.map(({ key, label }) => {
            const asset = logo[key];
            if (!asset) return null;
            return (
              <div key={key} className="flex flex-col items-center gap-2">
                <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-paper-well p-3 shadow-well">
                  {/* Arbitrary remote source per job, not a static build-time asset — plain img, not next/image. */}
                  <img
                    src={asset.url}
                    alt={`${label} logo variant`}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                <span className="text-xs text-ink-muted">{label}</span>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
