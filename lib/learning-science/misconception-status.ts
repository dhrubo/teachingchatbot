// A misconception is only "confirmed" (safe to surface to the tutor prompt
// or a parent report) once it's been independently observed this many times.
// Below this, it's "tentative" — tracked, but not asserted as a diagnosis.
// Shared between lib/db/queries/learning-science.ts (the upsert) and
// lib/learning-science/batch-misconception-analysis.ts (the caller) so
// neither has to import the other just for this constant.
export const MIN_FREQUENCY_FOR_CONFIRMED = 3;

export function statusForFrequency(
  frequency: number
): "tentative" | "confirmed" {
  return frequency >= MIN_FREQUENCY_FOR_CONFIRMED ? "confirmed" : "tentative";
}
