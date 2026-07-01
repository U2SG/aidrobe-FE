// Pure (RN-free) derivation of the Today v2 screen mode. Kept in its own module
// so it can be unit-asserted without a React Native renderer and so the screen
// reads its mode from a single source of truth. See scripts/todayMode.test.ts.
//
// Today is time-aware: the same wardrobe should not keep showing stale "wear this
// today" copy at night. The day is split into today-oriented and tomorrow-
// oriented bands, and an unusable wardrobe collapses to an honest cold-start
// state (never a faked outfit). See redesign brief v0.9 §4.
//
// Thresholds live here (and only here) so they can be tuned in one place.
export const EVENING_START_HOUR = 18;
export const LATE_NIGHT_START_HOUR = 22;
// Length of the morning prep window before departure during which Today is in
// active "getting ready" mode (drives the departure countdown affordance).
export const MORNING_LOOKAHEAD_MINUTES = 180;

export type FirstOutfitState = 'none' | 'no_outfit' | 'single_outfit' | 'ready';

export type TodayStateInput = {
  now: Date;
  /** "HH:mm" or "HH:mm:ss" local time, or null/undefined if unknown. */
  departureTime?: string | null;
  hasTodayRecommendation: boolean;
  /** Falls back to `hasTodayRecommendation` when not provided. */
  hasTomorrowRecommendation?: boolean;
  firstOutfitState?: FirstOutfitState;
};

export type TodayMode =
  | 'morning_today'
  | 'daytime_today'
  | 'evening_tomorrow'
  | 'late_night_tomorrow'
  | 'empty_or_cold_start';

/** Parse "HH:mm[:ss]" into minutes-of-day, or null if absent/malformed. */
export function parseDepartureMinutes(departureTime?: string | null): number | null {
  if (!departureTime) return null;
  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(departureTime.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/**
 * Whether `now` is inside the morning prep window — the last
 * MORNING_LOOKAHEAD_MINUTES before departure, up to (and including) departure.
 * Returns false when the departure time is unknown.
 */
export function isMorningPrepWindow(now: Date, departureTime?: string | null): boolean {
  const depMin = parseDepartureMinutes(departureTime);
  if (depMin == null) return false;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  return nowMin <= depMin && nowMin >= depMin - MORNING_LOOKAHEAD_MINUTES;
}

/**
 * Derive the Today mode.
 *
 * Order of precedence:
 *   1. A cold-start wardrobe (no first outfit yet) collapses to
 *      'empty_or_cold_start' regardless of time — never dress up an empty
 *      wardrobe as a recommendation.
 *   2. Evening/late-night (>= 18:00) is tomorrow-oriented; if there is nothing
 *      to prepare, it is also cold start.
 *   3. Daytime (< 18:00) is today-oriented, split at departure: before/at
 *      departure is morning, after is daytime. With no departure known, noon is
 *      the fallback split.
 */
export function deriveTodayMode(input: TodayStateInput): TodayMode {
  const { now, departureTime, hasTodayRecommendation, firstOutfitState } = input;

  if (firstOutfitState === 'none' || firstOutfitState === 'no_outfit') {
    return 'empty_or_cold_start';
  }

  const hour = now.getHours();

  if (hour >= EVENING_START_HOUR) {
    const hasTomorrow = input.hasTomorrowRecommendation ?? hasTodayRecommendation;
    if (!hasTomorrow) return 'empty_or_cold_start';
    return hour >= LATE_NIGHT_START_HOUR ? 'late_night_tomorrow' : 'evening_tomorrow';
  }

  if (!hasTodayRecommendation) return 'empty_or_cold_start';

  const depMin = parseDepartureMinutes(departureTime);
  const nowMin = hour * 60 + now.getMinutes();
  if (depMin == null) return hour < 12 ? 'morning_today' : 'daytime_today';
  return nowMin <= depMin ? 'morning_today' : 'daytime_today';
}
