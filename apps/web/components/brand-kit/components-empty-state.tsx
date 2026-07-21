import type { BrandJson } from "@brandkit/shared";

import { Card, CardTitle } from "../ui/card";

/**
 * `brandJson.components` is always `[]` — no phase implements component detection yet. This
 * renders that honestly rather than faking placeholder screenshots.
 */
export function ComponentsEmptyState({ components }: { components: BrandJson["components"] }) {
  return (
    <Card>
      <CardTitle>Component screenshots</CardTitle>
      {components.length === 0 ? (
        <p className="mt-3 text-sm text-ink-muted">
          Component detection isn&apos;t implemented yet — this section will show captured component
          screenshots in a future release.
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {components.map((component, i) => (
            <div key={i} className="rounded-xl bg-paper-well p-3 text-xs shadow-well">
              {component.type}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
