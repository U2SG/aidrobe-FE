// Regression coverage for the Today v2 reason builder. RN-free, import-free
// module (type-only import erased by type-stripping) so Node runs it directly.
// Run:  node scripts/todayReasons.test.ts   (Node >= 22 type-stripping)
import assert from 'node:assert/strict';

import { buildRecommendationReasons } from '../src/screens/today-v2/todayReasons.ts';

// Primary reason only → one entry, no fabricated source.
const one = buildRecommendationReasons({ reason: '延续你常穿的通勤风格。', prepNotes: null });
assert.equal(one.length, 1, 'primary reason yields one entry');
assert.equal(one[0].text, '延续你常穿的通勤风格。');
assert.equal(one[0].source, undefined, 'source is undefined until the BE provides it');

// Primary reason + prep notes are all surfaced as reasons.
const many = buildRecommendationReasons({
  reason: '天气偏热，选了透气的一套。',
  prepNotes: [
    { key: 'x', fallbackText: '出门套一件薄外套。' },
    { key: 'y', fallbackText: '午后可能变凉。' },
  ],
});
assert.equal(many.length, 3, 'primary + 2 prep notes → 3 reasons');
assert.equal(many[1].text, '出门套一件薄外套。');

// maxReasons caps the list.
const capped = buildRecommendationReasons(
  { reason: 'a', prepNotes: [{ key: 'k', fallbackText: 'b' }, { key: 'k2', fallbackText: 'c' }] },
  2,
);
assert.equal(capped.length, 2, 'maxReasons=2 caps the list');

// Empty / whitespace reasons are dropped — never render a blank reason row.
const empty = buildRecommendationReasons({ reason: '   ', prepNotes: [{ key: 'k', fallbackText: '' }] });
assert.equal(empty.length, 0, 'blank reason + blank note → no reasons');

console.log('todayReasons: 8/8 cases passed');
