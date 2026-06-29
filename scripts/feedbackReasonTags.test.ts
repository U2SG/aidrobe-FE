// Regression coverage for FE#72 — structured recommendation feedback chips.
// Asserts the chip → {feedback_type, reason_tags} mapping submits STABLE enum
// keys (never localized labels), and that every reason key has a localized label
// in both locales. RN-free modules only (recommendationFeedback.ts has no
// imports; domainLabels.ts is type-only-import) so Node type-stripping loads them.
// Run:  node scripts/feedbackReasonTags.test.ts   (Node >= 22)
import assert from 'node:assert/strict';

import { reasonChipToFeedback } from '../src/components/feedback/feedbackChips.ts';
import { REASON_TAG_KEYS, tReasonTag } from '../src/i18n/domainLabels.ts';

let passed = 0;
function check(label: string, cond: boolean) {
  assert.ok(cond, label);
  passed += 1;
}

// 'Love it' is a positive rating with no reason.
const love = reasonChipToFeedback('love');
check('love → positive rating, no reason', love.kind === 'love' && love.reasonTags.length === 0);

// A reason chip is a dislike carrying exactly its stable enum key.
const formal = reasonChipToFeedback('too_formal');
check(
  'reason chip → dislike with its stable enum key',
  formal.kind === 'dislike' && formal.reasonTags.length === 1 && formal.reasonTags[0] === 'too_formal',
);

// Submitted value is the stable key, never the localized label.
check(
  'submitted reasonTags use the stable key',
  reasonChipToFeedback('wrong_color').reasonTags[0] === 'wrong_color',
);

// At least 5 reasons, each localized in both locales (and not the raw key).
check('at least 5 reason chips', REASON_TAG_KEYS.length >= 5);
for (const key of REASON_TAG_KEYS) {
  const zh = tReasonTag('zh-CN', key);
  const en = tReasonTag('en-US', key);
  check(`${key} has a zh-CN label`, zh.length > 0 && zh !== key);
  check(`${key} has an en-US label`, en.length > 0 && en !== key);
}

// eslint-disable-next-line no-console
console.log(`feedbackReasonTags: ${passed}/${passed} cases passed`);
