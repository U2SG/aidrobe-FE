// Pure (RN-free, import-free) time-of-day UX helpers for the redesign's
// low-friction / low-interruption rules (brief v0.9 §6.4, §8). Kept dependency
// free so the Node regression runner can assert them.

// Kept local (not imported from todayMode) so this stays runtime import-free for
// the Node test; mirror any tuning there.
export const LATE_NIGHT_START_HOUR = 22;
const WIND_DOWN_START_HOUR = 20;

/**
 * How many confirmation questions an import may ask, by time of day (§6.4).
 * Late night defaults to zero — "先收下，之后再慢慢整理".
 *   22:00+  → 0
 *   20:00–22:00 → 1
 *   otherwise → 2
 */
export function confirmationBudgetForImport(now: Date): number {
  const hour = now.getHours();
  if (hour >= LATE_NIGHT_START_HOUR) return 0;
  if (hour >= WIND_DOWN_START_HOUR) return 1;
  return 2;
}

/** True at/after the late-night threshold (no heavy prompts past this). */
export function isLateNight(now: Date): boolean {
  return now.getHours() >= LATE_NIGHT_START_HOUR;
}
