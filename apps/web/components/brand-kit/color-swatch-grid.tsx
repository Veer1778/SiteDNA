import type { BrandJson } from "@brandkit/shared";

import { Card, CardTitle } from "../ui/card";

const ROLE_LABELS: Record<keyof BrandJson["colors"], string> = {
  primary: "Primary",
  secondary: "Secondary",
  accent: "Accent",
  surface: "Surface",
  background: "Background",
  text: "Text",
  border: "Border",
  success: "Success",
  warning: "Warning",
  danger: "Danger",
};

export function ColorSwatchGrid({ colors }: { colors: BrandJson["colors"] }) {
  const entries = (Object.keys(ROLE_LABELS) as Array<keyof BrandJson["colors"]>)
    .map((role) => ({ role, value: colors[role] }))
    .filter((entry) => entry.value !== undefined);

  if (entries.length === 0) {
    return (
      <Card>
        <CardTitle>Colors</CardTitle>
        <p className="mt-3 text-sm text-ink-muted">No colors were confidently extracted.</p>
      </Card>
    );
  }

  return (
    <Card>
      <CardTitle>Colors</CardTitle>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {entries.map(({ role, value }) => (
          <div key={role} className="flex flex-col gap-2 rounded-xl bg-paper-well p-3 shadow-well">
            <div
              className="h-12 w-full rounded-lg shadow-raised-sm"
              style={{ backgroundColor: value?.hex }}
              aria-hidden="true"
            />
            <div className="text-xs">
              <div className="font-medium text-ink">{ROLE_LABELS[role]}</div>
              <div className="text-ink-muted">{value?.hex}</div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
