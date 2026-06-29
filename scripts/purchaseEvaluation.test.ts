// Regression coverage for FE#74 — purchase-evaluation card presentation helpers
// (severity ranking / tone / gap ordering). RN-free module (type-only imports) so
// Node type-stripping loads it. Run: node scripts/purchaseEvaluation.test.ts
import assert from 'node:assert/strict';

import {
  redundancyReasonKind,
  severityRank,
  severityTone,
  sortGapsBySeverity,
  toEvaluation,
} from '../src/screens/discover/purchaseEvaluation.ts';
import { enUS } from '../src/i18n/en-US.ts';
import { zhCN } from '../src/i18n/zh-CN.ts';

let passed = 0;
function check(label: string, cond: boolean) {
  assert.ok(cond, label);
  passed += 1;
}

// Ranking: high > medium > low > unknown.
check('high outranks medium', severityRank('high') > severityRank('medium'));
check('medium outranks low', severityRank('medium') > severityRank('low'));
check('low outranks unknown', severityRank('low') > severityRank('weird'));

// Tone: helpful, tops out at warning-ish 'danger' (never an alarm color).
check('high → danger', severityTone('high') === 'danger');
check('medium → warning', severityTone('medium') === 'warning');
check('low → neutral', severityTone('low') === 'neutral');
check('unknown → neutral', severityTone(undefined) === 'neutral');

// Gap sort: most-severe first; stable for equal severities; input not mutated.
const gaps = [
  { category: 'top', severity: 'low' },
  { category: 'shoes', severity: 'high' },
  { category: 'bottom', severity: 'medium' },
  { category: 'outerwear', severity: 'high' },
];
const sorted = sortGapsBySeverity(gaps);
check('most severe first', sorted[0]?.severity === 'high' && sorted[sorted.length - 1]?.severity === 'low');
check('stable for equal severity (shoes before outerwear)', sorted[0]?.category === 'shoes' && sorted[1]?.category === 'outerwear');
check('does not mutate input', gaps[0]?.category === 'top');

// --- FE#74 follow-up: API mapping, redundancy reason, i18n parity ---

// toEvaluation: null passthrough + snake→camel mapping.
check('toEvaluation(null) is null', toEvaluation(null) === null);
check('toEvaluation(undefined) is null', toEvaluation(undefined) === null);
const mapped = toEvaluation({
  confidence: 0.8,
  redundancy: { level: 'high', similar_owned_items: [{ item_id: 'a', similarity: 0.92, reason: '同类同色' }] },
  wardrobe_gap_detail: [{ category: 'shoes', severity: 'high' }],
  factors: [{ factor: 'redundancy', detail: 'high', direction: 'skip' }],
  cost_per_wear_hint: '按 299 元计…',
});
check('maps redundancy similar items snake→camel', mapped?.redundancy?.similarOwnedItems[0]?.itemId === 'a');
check('maps wardrobe gap detail', mapped?.wardrobeGapDetail[0]?.category === 'shoes');
check('maps cost-per-wear hint presence', mapped?.costPerWearHint === '按 299 元计…');

// Redundancy reason derived from similarity (FE-localized, not BE free text).
check('>= 0.9 → same color & category', redundancyReasonKind(0.92) === 'same_color_category');
check('< 0.9 → same category', redundancyReasonKind(0.7) === 'same_category');

// i18n parity for the new keys (no raw-key leak, both locales present).
const NEW_KEYS = [
  'sense_check.consider.preference_conflict',
  'sense_check.eval.costPerWear.body',
  'sense_check.eval.redundancy.reason.same_color_category',
  'sense_check.eval.redundancy.reason.same_category',
  'sense_check.price.label',
] as const;
for (const key of NEW_KEYS) {
  check(`${key} has zh-CN copy`, typeof zhCN[key] === 'string' && zhCN[key].length > 0);
  check(`${key} has en-US copy`, typeof enUS[key] === 'string' && enUS[key].length > 0);
}

// eslint-disable-next-line no-console
console.log(`purchaseEvaluation: ${passed}/${passed} cases passed`);
