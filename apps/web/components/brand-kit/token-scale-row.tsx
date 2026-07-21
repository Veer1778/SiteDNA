"use client";

import type { BrandJson } from "@brandkit/shared";
import { useState } from "react";

import { Card, CardTitle } from "../ui/card";

const DEFAULT_VISIBLE_COUNT = 8;

function EmptyNote({ children }: { children: string }) {
  return <p className="mt-3 text-sm text-ink-muted">{children}</p>;
}

/** "Show N more" toggle for a real-world token list that can run into dozens of distinct values
 *  (e.g. shadows aren't capped upstream the way spacing/radius are) — keeps a dashboard card from
 *  turning into an uncapped wall of rows by default, while the full data is one click away. */
function useVisibleCount(total: number, initial: number = DEFAULT_VISIBLE_COUNT) {
  const [expanded, setExpanded] = useState(false);
  const visibleCount = expanded ? total : Math.min(initial, total);
  const remaining = total - visibleCount;
  return { visibleCount, remaining, expanded, setExpanded };
}

function ShowMoreButton({ remaining, onClick }: { remaining: number; onClick: () => void }) {
  if (remaining <= 0) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-3 self-start text-xs font-medium text-accent-hover underline-offset-2 hover:underline"
    >
      Show {remaining} more
    </button>
  );
}

export function SpacingCard({ spacing }: { spacing: BrandJson["spacing"] }) {
  const { visibleCount, remaining, setExpanded } = useVisibleCount(spacing.length);
  return (
    <Card>
      <CardTitle>Spacing scale</CardTitle>
      {spacing.length === 0 ? (
        <EmptyNote>No consistent spacing scale detected.</EmptyNote>
      ) : (
        <div className="flex flex-col">
          <ul className="mt-4 flex flex-col gap-2">
            {spacing.slice(0, visibleCount).map((px) => (
              <li key={px} className="flex items-center gap-3">
                <span className="w-12 shrink-0 font-mono text-xs text-ink-muted">{px}px</span>
                <span
                  className="h-2.5 rounded bg-accent-soft shadow-well"
                  style={{ width: `${Math.min(100, Math.max(6, px))}%` }}
                  aria-hidden="true"
                />
              </li>
            ))}
          </ul>
          <ShowMoreButton remaining={remaining} onClick={() => setExpanded(true)} />
        </div>
      )}
    </Card>
  );
}

export function RadiusCard({ radius }: { radius: BrandJson["radius"] }) {
  return (
    <Card>
      <CardTitle>Radius scale</CardTitle>
      {radius.length === 0 ? (
        <EmptyNote>No border-radius scale detected.</EmptyNote>
      ) : (
        <div className="mt-4 flex flex-wrap gap-3">
          {radius.map((px) => (
            <div key={px} className="flex flex-col items-center gap-1.5">
              <div
                className="h-10 w-10 border border-border-soft bg-paper-well shadow-well"
                style={{ borderRadius: px }}
                aria-hidden="true"
              />
              <span className="font-mono text-xs text-ink-muted">{px}px</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export function AnimationsCard({ animations }: { animations: BrandJson["animations"] }) {
  const hasContent = animations.durations.length > 0 || animations.easings.length > 0;
  const durations = useVisibleCount(animations.durations.length);

  return (
    <Card>
      <CardTitle>Animations</CardTitle>
      {!hasContent ? (
        <EmptyNote>No transition/animation durations detected.</EmptyNote>
      ) : (
        <div className="mt-4 flex flex-col gap-4">
          {animations.durations.length > 0 && (
            <div className="flex flex-col">
              <div className="text-xs font-medium text-ink-muted">Durations</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {animations.durations.slice(0, durations.visibleCount).map((ms) => (
                  <span
                    key={ms}
                    className="rounded-full bg-paper-well px-3 py-1 font-mono text-xs text-ink shadow-well"
                  >
                    {ms}ms
                  </span>
                ))}
              </div>
              <ShowMoreButton
                remaining={durations.remaining}
                onClick={() => durations.setExpanded(true)}
              />
            </div>
          )}
          {animations.easings.length > 0 && (
            <div>
              <div className="text-xs font-medium text-ink-muted">Easings</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {animations.easings.map((easing) => (
                  <span
                    key={easing}
                    className="rounded-full bg-paper-well px-3 py-1 font-mono text-xs text-ink shadow-well"
                  >
                    {easing}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

export function ShadowsCard({ shadows }: { shadows: BrandJson["shadows"] }) {
  const { visibleCount, remaining, setExpanded } = useVisibleCount(shadows.length);
  return (
    <Card>
      <CardTitle>Shadows</CardTitle>
      {shadows.length === 0 ? (
        <EmptyNote>No box-shadows detected.</EmptyNote>
      ) : (
        <div className="flex flex-col">
          <ul className="mt-4 flex flex-col gap-3">
            {shadows.slice(0, visibleCount).map((shadow, i) => {
              const css = `${shadow.inset ? "inset " : ""}${shadow.offsetX}px ${shadow.offsetY}px ${shadow.blur}px ${shadow.spread}px ${shadow.color}`;
              return (
                <li
                  key={i}
                  className="flex items-center gap-3 rounded-lg bg-paper-well p-2 shadow-well"
                >
                  {/* Clipped preview window: real shadows can have far larger blur/offset than
                      fits a small swatch, so the effect is clipped to a fixed frame rather than
                      left to overflow into surrounding layout. */}
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-paper-raised">
                    <div
                      className="h-full w-full rounded-md bg-paper-raised"
                      style={{ boxShadow: css }}
                      aria-hidden="true"
                    />
                  </div>
                  <code className="min-w-0 truncate text-xs text-ink-muted" title={css}>
                    {css}
                  </code>
                </li>
              );
            })}
          </ul>
          <ShowMoreButton remaining={remaining} onClick={() => setExpanded(true)} />
        </div>
      )}
    </Card>
  );
}
