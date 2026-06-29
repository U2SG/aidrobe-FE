// Regression coverage for FE#74 — purchase-evaluation card presentation helpers
// (severity ranking / tone / gap ordering). RN-free module (type-only imports) so
// Node type-stripping loads it. Run: node scripts/purchaseEvaluation.test.ts
import assert from 'node:assert/strict';

import {
  severityRank,
  severityTone,
  sortGapsBySeverity,
} from '../src/screens/discover/purchaseEvaluation.ts';

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

// eslint-disable-next-line no-console
console.log(`purchaseEvaluation: ${passed}/${passed} cases passed`);
