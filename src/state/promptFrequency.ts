// Pure (RN-free, import-free) frequency-cap logic for passive prompts (brief
// v0.9 §8). All caps are centralized constants here; the persisted store
// (src/store/promptFrequency.ts) just holds the state and calls these. Tested by
// scripts/promptFrequency.test.ts.

const DAY_MS = 24 * 60 * 60 * 1000;

// --- Centralized caps ----------------------------------------------------------
export const PASSIVE_WEAR_MAX_PER_WEEK = 2; // ≤ 2 appearances / rolling 7 days
export const PASSIVE_WEAR_SUPPRESS_AFTER_IGNORES = 2; // ignored N in a row → mute
export const PASSIVE_WEAR_SUPPRESS_DAYS = 7;
export const PASSIVE_WEAR_ROLLING_DAYS = 7;
export const PASSIVE_WEAR_NIGHT_HOUR = 22; // never shown at/after this hour

export const RESURFACE_MAX_PER_DAY = 1;
export const RESURFACE_SAME_ITEM_COOLDOWN_DAYS = 14;

export type PassiveWearState = {
  shownAt: number[];
  consecutiveIgnores: number;
  suppressedUntil: number | null;
};

export type ResurfaceState = {
  lastShownAt: number | null;
  itemLastShownAt: Record<string, number>;
};

export type PromptFrequencyState = {
  passiveWear: PassiveWearState;
  resurface: ResurfaceState;
};

export function initialPromptFrequencyState(): PromptFrequencyState {
  return {
    passiveWear: { shownAt: [], consecutiveIgnores: 0, suppressedUntil: null },
    resurface: { lastShownAt: null, itemLastShownAt: {} },
  };
}

function sameCalendarDay(a: number, b: number): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

// --- Passive wear prompt -------------------------------------------------------
export function canShowPassiveWearPrompt(s: PassiveWearState, now: number): boolean {
  if (new Date(now).getHours() >= PASSIVE_WEAR_NIGHT_HOUR) return false;
  if (s.suppressedUntil != null && now < s.suppressedUntil) return false;
  const recent = s.shownAt.filter((t) => now - t < PASSIVE_WEAR_ROLLING_DAYS * DAY_MS);
  return recent.length < PASSIVE_WEAR_MAX_PER_WEEK;
}

export function recordPassiveWearShown(s: PassiveWearState, now: number): PassiveWearState {
  const shownAt = [...s.shownAt, now].filter((t) => now - t < PASSIVE_WEAR_ROLLING_DAYS * DAY_MS);
  return { ...s, shownAt };
}

export function recordPassiveWearIgnored(s: PassiveWearState, now: number): PassiveWearState {
  const consecutiveIgnores = s.consecutiveIgnores + 1;
  if (consecutiveIgnores >= PASSIVE_WEAR_SUPPRESS_AFTER_IGNORES) {
    return {
      ...s,
      consecutiveIgnores: 0,
      suppressedUntil: now + PASSIVE_WEAR_SUPPRESS_DAYS * DAY_MS,
    };
  }
  return { ...s, consecutiveIgnores };
}

export function recordPassiveWearAnswered(s: PassiveWearState): PassiveWearState {
  return { ...s, consecutiveIgnores: 0 };
}

// --- Resurface insight ---------------------------------------------------------
export function canShowResurfaceInsight(s: ResurfaceState, now: number, itemId: string): boolean {
  // Max 1 per day, and never stack (same day guard covers both).
  if (s.lastShownAt != null && sameCalendarDay(s.lastShownAt, now)) return false;
  const itemLast = s.itemLastShownAt[itemId];
  if (itemLast != null && now - itemLast < RESURFACE_SAME_ITEM_COOLDOWN_DAYS * DAY_MS) return false;
  return true;
}

export function recordResurfaceShown(s: ResurfaceState, now: number, itemId: string): ResurfaceState {
  return {
    ...s,
    lastShownAt: now,
    itemLastShownAt: { ...s.itemLastShownAt, [itemId]: now },
  };
}
