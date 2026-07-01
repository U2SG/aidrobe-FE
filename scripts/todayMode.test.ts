// Regression coverage for the Today v2 time-aware mode machine (redesign brief
// v0.9 §4). Dependency-free assertions over the pure helpers the screen reads
// from. Run:  node scripts/todayMode.test.ts   (Node >= 22 type-stripping)
// Lives outside src/ so it's excluded from `npm run lint` (scoped to src/**).
import assert from 'node:assert/strict';

import {
  deriveTodayMode,
  isMorningPrepWindow,
  parseDepartureMinutes,
  wearLabelKeyForMode,
} from '../src/screens/today-v2/todayMode.ts';

// Local-time Date at HH:mm on a fixed day (month/day are irrelevant to the mode).
const at = (hour: number, minute = 0) => new Date(2026, 0, 15, hour, minute);
const ready = { hasTodayRecommendation: true, firstOutfitState: 'ready' as const };

// --- Brief §4.4 acceptance: the four canonical clock times ---------------------
assert.equal(
  deriveTodayMode({ now: at(8, 0), departureTime: '08:30', ...ready }),
  'morning_today',
  '08:00 before an 08:30 departure → morning_today',
);
assert.equal(
  deriveTodayMode({ now: at(14, 0), departureTime: '08:30', ...ready }),
  'daytime_today',
  '14:00 after departure, before evening → daytime_today',
);
assert.equal(
  deriveTodayMode({ now: at(19, 0), departureTime: '08:30', ...ready }),
  'evening_tomorrow',
  '19:00 → evening_tomorrow (focus shifts to tomorrow)',
);
assert.equal(
  deriveTodayMode({ now: at(23, 0), departureTime: '08:30', ...ready }),
  'late_night_tomorrow',
  '23:00 → late_night_tomorrow',
);

// --- Band boundaries -----------------------------------------------------------
assert.equal(
  deriveTodayMode({ now: at(18, 0), departureTime: '08:30', ...ready }),
  'evening_tomorrow',
  '18:00 sharp → evening_tomorrow (EVENING_START_HOUR inclusive)',
);
assert.equal(
  deriveTodayMode({ now: at(22, 0), departureTime: '08:30', ...ready }),
  'late_night_tomorrow',
  '22:00 sharp → late_night_tomorrow (LATE_NIGHT_START_HOUR inclusive)',
);
assert.equal(
  deriveTodayMode({ now: at(8, 30), departureTime: '08:30', ...ready }),
  'morning_today',
  'at the departure minute is still morning (inclusive)',
);
assert.equal(
  deriveTodayMode({ now: at(8, 31), departureTime: '08:30', ...ready }),
  'daytime_today',
  'one minute past departure → daytime',
);

// A late departure must not pin morning all day — before the prep window is daytime.
assert.equal(
  deriveTodayMode({ now: at(9, 0), departureTime: '17:00', ...ready }),
  'daytime_today',
  '09:00 with a 17:00 departure is outside the prep window → daytime, not morning',
);
assert.equal(
  deriveTodayMode({ now: at(15, 0), departureTime: '17:00', ...ready }),
  'morning_today',
  '15:00 with a 17:00 departure is inside the 180-min prep window → morning',
);

// --- No departure known: noon is the morning/daytime fallback split ------------
assert.equal(
  deriveTodayMode({ now: at(9), departureTime: null, ...ready }),
  'morning_today',
  'no departure, before noon → morning_today',
);
assert.equal(
  deriveTodayMode({ now: at(13), departureTime: null, ...ready }),
  'daytime_today',
  'no departure, after noon → daytime_today',
);

// --- Cold start / unusable wardrobe never fakes an outfit ----------------------
assert.equal(
  deriveTodayMode({ now: at(8), departureTime: '08:30', hasTodayRecommendation: true, firstOutfitState: 'no_outfit' }),
  'empty_or_cold_start',
  'no_outfit forces cold start even in the morning with a recommendation flag',
);
assert.equal(
  deriveTodayMode({ now: at(8), hasTodayRecommendation: false }),
  'empty_or_cold_start',
  'morning with no today recommendation → cold start',
);
assert.equal(
  deriveTodayMode({ now: at(20), hasTodayRecommendation: false, hasTomorrowRecommendation: false }),
  'empty_or_cold_start',
  'evening with nothing to prepare for tomorrow → cold start',
);
assert.equal(
  deriveTodayMode({ now: at(20), hasTodayRecommendation: false, hasTomorrowRecommendation: true }),
  'evening_tomorrow',
  'evening with a tomorrow recommendation → evening_tomorrow even if today is empty',
);
assert.equal(
  deriveTodayMode({ now: at(20), hasTodayRecommendation: true }),
  'evening_tomorrow',
  'evening: hasTomorrow falls back to hasToday when unset',
);

// --- parseDepartureMinutes -----------------------------------------------------
assert.equal(parseDepartureMinutes('08:30'), 510, 'HH:mm parses to minutes-of-day');
assert.equal(parseDepartureMinutes('08:30:00'), 510, 'HH:mm:ss parses, seconds ignored');
assert.equal(parseDepartureMinutes(null), null, 'null → null');
assert.equal(parseDepartureMinutes('nope'), null, 'malformed → null');
assert.equal(parseDepartureMinutes('25:00'), null, 'out-of-range hour → null');

// --- isMorningPrepWindow (last MORNING_LOOKAHEAD_MINUTES before departure) ------
assert.equal(isMorningPrepWindow(at(8, 0), '08:30'), true, '30 min before departure → in prep window');
assert.equal(isMorningPrepWindow(at(5, 0), '08:30'), false, '210 min before departure → outside 180-min window');
assert.equal(isMorningPrepWindow(at(9, 0), '08:30'), false, 'after departure → not in prep window');
assert.equal(isMorningPrepWindow(at(8, 0), null), false, 'unknown departure → false');

// --- CTA label is mode-aware (brief §4.4: no stale "wear today" copy at night) -
// This is the exact key the Today v2 screen feeds its primary button, so it
// covers the screen wiring, not just the enum.
assert.equal(wearLabelKeyForMode('morning_today'), 'today.v2.wear', 'morning → wear today');
assert.equal(wearLabelKeyForMode('daytime_today'), 'today.v2.wear', 'daytime → wear today');
assert.equal(wearLabelKeyForMode('evening_tomorrow'), 'today.v2.wearTomorrow', 'evening → set for tomorrow');
assert.equal(
  wearLabelKeyForMode('late_night_tomorrow'),
  'today.v2.wearTomorrow',
  'late night → set for tomorrow (never "wear today")',
);

console.log('todayMode: 30/30 cases passed');
