import type { BrandJson } from "@brandkit/shared";

import type { CompletenessReport, Gap } from "./schema.js";

/** Below this confidence, a present color role still counts as a (low-confidence) gap. */
export const LOW_CONFIDENCE_THRESHOLD = 0.6;

const COLOR_ROLES = [
  "primary",
  "secondary",
  "accent",
  "surface",
  "background",
  "text",
  "border",
  "success",
  "warning",
  "danger",
] as const;

const LOGO_SLOTS = ["light", "dark", "favicon"] as const;

interface Checklist {
  totalPoints: number;
  earnedPoints: number;
  gaps: Gap[];
}

function checkColorRole(
  checklist: Checklist,
  role: (typeof COLOR_ROLES)[number],
  brandJson: BrandJson,
): void {
  checklist.totalPoints += 1;
  const value = brandJson.colors[role];
  if (!value) {
    checklist.gaps.push({
      field: `colors.${role}`,
      severity: "missing",
      message: `no ${role} color detected`,
    });
    return;
  }
  if (value.confidence < LOW_CONFIDENCE_THRESHOLD) {
    checklist.earnedPoints += 0.5;
    checklist.gaps.push({
      field: `colors.${role}`,
      severity: "low-confidence",
      message: `${role} color detected with low confidence (${value.confidence})`,
    });
    return;
  }
  checklist.earnedPoints += 1;
}

function checkPresence(
  checklist: Checklist,
  field: string,
  present: boolean,
  message: string,
): void {
  checklist.totalPoints += 1;
  if (present) {
    checklist.earnedPoints += 1;
  } else {
    checklist.gaps.push({ field, severity: "missing", message });
  }
}

/**
 * A simple, documented completeness heuristic over a fixed checklist: every `ColorRoles` role
 * (including `success`/`warning`/`danger`, which no phase can currently detect — reporting them
 * honestly is more useful than excluding them to inflate the score), every logo slot,
 * non-empty spacing/radius/shadows/animations/voice/styleClassification, and `components`
 * (always flagged — no phase implements component detection yet). Typography is excluded: it
 * has no confidence field and always has *some* value (a documented fallback), so a presence
 * check would be vacuous.
 */
export function computeCompleteness(brandJson: BrandJson): CompletenessReport {
  const checklist: Checklist = { totalPoints: 0, earnedPoints: 0, gaps: [] };

  for (const role of COLOR_ROLES) checkColorRole(checklist, role, brandJson);

  for (const slot of LOGO_SLOTS) {
    checkPresence(
      checklist,
      `logo.${slot}`,
      brandJson.logo[slot] !== undefined,
      `no ${slot} logo detected`,
    );
  }

  checkPresence(checklist, "spacing", brandJson.spacing.length > 0, "no spacing scale detected");
  checkPresence(checklist, "radius", brandJson.radius.length > 0, "no radius scale detected");
  checkPresence(checklist, "shadows", brandJson.shadows.length > 0, "no shadows detected");
  checkPresence(
    checklist,
    "animations",
    brandJson.animations.durations.length > 0 || brandJson.animations.easings.length > 0,
    "no animation durations/easings detected",
  );
  checkPresence(
    checklist,
    "components",
    brandJson.components.length > 0,
    "component detection is not implemented in any phase yet",
  );
  checkPresence(
    checklist,
    "voice",
    brandJson.voice.length > 0,
    "no brand voice detected (Vision AI not run?)",
  );
  checkPresence(
    checklist,
    "styleClassification",
    brandJson.styleClassification.length > 0,
    "no style classification detected (Vision AI not run?)",
  );

  const score =
    checklist.totalPoints === 0
      ? 1
      : Math.round((checklist.earnedPoints / checklist.totalPoints) * 100) / 100;

  return { score, gaps: checklist.gaps };
}
