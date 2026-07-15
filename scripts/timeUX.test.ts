// Regression coverage for time-of-day UX helpers (brief v0.9 §6.4).
// Run:  node scripts/timeUX.test.ts   (Node >= 22 type-stripping)
import assert from 'node:assert/strict';

import { confirmationBudgetForImport, isLateNight } from '../src/utils/timeUX.ts';

const at = (hour: number) => new Date(2026, 0, 15, hour, 0, 0);

assert.equal(confirmationBudgetForImport(at(9)), 2, 'daytime → 2 confirmations');
assert.equal(confirmationBudgetForImport(at(19)), 2, '19:00 → 2');
assert.equal(confirmationBudgetForImport(at(20)), 1, '20:00 wind-down → 1');
assert.equal(confirmationBudgetForImport(at(21)), 1, '21:00 → 1');
assert.equal(confirmationBudgetForImport(at(22)), 0, '22:00 late night → 0');
assert.equal(confirmationBudgetForImport(at(23)), 0, '23:00 → 0');

assert.equal(isLateNight(at(21)), false, '21:00 is not late night');
assert.equal(isLateNight(at(22)), true, '22:00 is late night');

console.log('timeUX: 8/8 cases passed');
