// Regression coverage for FE#73 — packing planner structure-only helpers
// (reuse count / day ordering / item-id collection). RN-free (type-only imports)
// so Node type-stripping loads it. Run: node scripts/packingPlan.test.ts
import assert from 'node:assert/strict';

import {
  planItemIds,
  reuseCountByItem,
  sortDailyOutfits,
} from '../src/screens/discover/packingPlan.ts';
import { SCENE_VALUES, tScene } from '../src/i18n/domainLabels.ts';

let passed = 0;
function check(label: string, cond: boolean) {
  assert.ok(cond, label);
  passed += 1;
}

const days = [
  { day: 2, occasion: 'casual', itemIds: ['a', 'b'], reasoning: [] },
  { day: 1, occasion: 'business', itemIds: ['a', 'c'], reasoning: [] },
];

// Reuse count: item 'a' worn both days; 'b'/'c' once.
const reuse = reuseCountByItem(days);
check('reused item counted across days', reuse['a'] === 2);
check('single-day item counted once', reuse['b'] === 1 && reuse['c'] === 1);
check('absent item is undefined', reuse['z'] === undefined);

// Day ordering: ascending, input not mutated.
const sorted = sortDailyOutfits(days);
check('sorted ascending by day', sorted[0]?.day === 1 && sorted[1]?.day === 2);
check('does not mutate input', days[0]?.day === 2);

// Unique item ids across the plan.
const ids = planItemIds(days);
check('unique item ids', ids.length === 3 && ids.includes('a') && ids.includes('b') && ids.includes('c'));

// Planner scene values (commute/business/…) localize in both locales — not the
// raw English token (the FE#80 review fix: they aren't `occasion` enum values).
for (const scene of SCENE_VALUES) {
  const zh = tScene('zh-CN', scene);
  const en = tScene('en-US', scene);
  check(`${scene} has a zh-CN label`, zh.length > 0 && zh !== scene);
  check(`${scene} has an en-US label`, en.length > 0);
}
check('commute localizes to 通勤 in zh-CN', tScene('zh-CN', 'commute') === '通勤');

// eslint-disable-next-line no-console
console.log(`packingPlan: ${passed}/${passed} cases passed`);
