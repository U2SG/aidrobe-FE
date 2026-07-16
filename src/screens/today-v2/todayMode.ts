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

export type TodayRecommendationQueryKey = readonly [
  'todayRecommendation',
  string,
  'today' | 'tomorrow',
];

/**
 * Keep a date-aware cache split between a request for today's recommendation
 * and the previous evening's request for tomorrow. Those requests can name the
 * same calendar date across midnight, but they are not interchangeable when a
 * legacy or flag-off backend ignores target_date.
 */
export function todayRecommendationQueryKey(
  localDate: string,
  targetDate?: string,
): TodayRecommendationQueryKey {
  return [
    'todayRecommendation',
    targetDate ?? localDate,
    targetDate ? 'tomorrow' : 'today',
  ] as const;
}

/** True when the mode is tomorrow-oriented (evening / late night). */
export function isTomorrowOriented(mode: TodayMode): boolean {
  return mode === 'evening_tomorrow' || mode === 'late_night_tomorrow';
}

/**
 * i18n key for the primary CTA, mode-aware so evening/late-night never shows the
 * stale "wear today" copy (brief §4.4). The Today v2 screen reads its CTA label
 * from here, so this single assertion covers the screen wiring too.
 */
export function wearLabelKeyForMode(mode: TodayMode): 'today.v2.wear' | 'today.v2.wearTomorrow' {
  return isTomorrowOriented(mode) ? 'today.v2.wearTomorrow' : 'today.v2.wear';
}

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
  if (depMin == null) return hour < 12 ? 'morning_today' : 'daytime_today';
  // Morning only inside the prep window before departure — so a late (e.g. 17:00)
  // departure doesn't pin the screen to "getting ready" all day; before the
  // window (and after departure) is daytime.
  return isMorningPrepWindow(now, departureTime) ? 'morning_today' : 'daytime_today';
}
