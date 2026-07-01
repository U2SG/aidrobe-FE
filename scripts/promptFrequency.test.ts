// Regression coverage for passive-prompt frequency caps (brief v0.9 §8).
// Run:  node scripts/promptFrequency.test.ts   (Node >= 22 type-stripping)
import assert from 'node:assert/strict';

import {
  canShowPassiveWearPrompt,
  canShowResurfaceInsight,
  initialPromptFrequencyState,
  recordPassiveWearIgnored,
  recordPassiveWearShown,
  recordResurfaceShown,
} from '../src/state/promptFrequency.ts';

const DAY = 24 * 60 * 60 * 1000;
const dayAt = (hour: number) => new Date(2026, 0, 15, hour, 0, 0).getTime();

// --- Passive wear cap: ≤ 2 / rolling 7 days ------------------------------------
let pw = initialPromptFrequencyState().passiveWear;
const t0 = dayAt(10);
assert.equal(canShowPassiveWearPrompt(pw, t0), true, 'fresh state, daytime → can show');
pw = recordPassiveWearShown(pw, t0);
pw = recordPassiveWearShown(pw, t0 + DAY);
assert.equal(canShowPassiveWearPrompt(pw, t0 + 2 * DAY), false, '2 shows in the window → capped');
assert.equal(canShowPassiveWearPrompt(pw, t0 + 8 * DAY), true, 'both shows aged out of 7d window → can show again');

// --- Never after 22:00 ---------------------------------------------------------
assert.equal(
  canShowPassiveWearPrompt(initialPromptFrequencyState().passiveWear, dayAt(22)),
  false,
  '22:00 → never show, even fresh',
);

// --- Ignored twice in a row → suppressed 7 days --------------------------------
let pw2 = initialPromptFrequencyState().passiveWear;
pw2 = recordPassiveWearIgnored(pw2, t0);
assert.equal(canShowPassiveWearPrompt(pw2, t0 + 60_000), true, 'one ignore → not yet suppressed');
pw2 = recordPassiveWearIgnored(pw2, t0 + 60_000);
assert.equal(canShowPassiveWearPrompt(pw2, t0 + 2 * DAY), false, '2 consecutive ignores → suppressed');
assert.equal(canShowPassiveWearPrompt(pw2, t0 + 8 * DAY), true, 'suppression lifts after 7 days');

// --- Resurface: 1/day, same-item 14-day cooldown, no stacking ------------------
let rs = initialPromptFrequencyState().resurface;
assert.equal(canShowResurfaceInsight(rs, t0, 'item-a'), true, 'fresh → can show');
rs = recordResurfaceShown(rs, t0, 'item-a');
assert.equal(canShowResurfaceInsight(rs, t0 + 3600_000, 'item-b'), false, 'already shown today → no stacking (1/day)');
assert.equal(canShowResurfaceInsight(rs, t0 + 2 * DAY, 'item-a'), false, 'same item within 14d → cooldown blocks');
assert.equal(canShowResurfaceInsight(rs, t0 + 2 * DAY, 'item-b'), true, 'different day + different item → can show');
assert.equal(canShowResurfaceInsight(rs, t0 + 15 * DAY, 'item-a'), true, 'same item after 14d cooldown → can show');

console.log('promptFrequency: 12/12 cases passed');
