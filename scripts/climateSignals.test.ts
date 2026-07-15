// Regression coverage for indoor-climate mismatch detection (brief v0.9 §9.2).
// Run:  node scripts/climateSignals.test.ts   (Node >= 22 type-stripping)
import assert from 'node:assert/strict';

import { detectIndoorClimateSignal } from '../src/utils/climateSignals.ts';

assert.equal(detectIndoorClimateSignal('too_cold', 25), 'indoor_cold', 'too cold while warm out → indoor_cold');
assert.equal(detectIndoorClimateSignal('too_cold', 22), 'indoor_cold', '22°C boundary is inclusive');
assert.equal(detectIndoorClimateSignal('too_cold', 18), null, 'too cold at 18°C → no mismatch');
assert.equal(detectIndoorClimateSignal('too_warm', 6), 'indoor_warm', 'too warm while cold out → indoor_warm');
assert.equal(detectIndoorClimateSignal('too_warm', 10), 'indoor_warm', '10°C boundary is inclusive');
assert.equal(detectIndoorClimateSignal('too_warm', 15), null, 'too warm at 15°C → no mismatch');
assert.equal(detectIndoorClimateSignal('wrong_color', 25), null, 'unrelated reason → null');
assert.equal(detectIndoorClimateSignal('too_cold', null), null, 'unknown temperature → null');
assert.equal(detectIndoorClimateSignal('too_cold', undefined), null, 'undefined temperature → null');

console.log('climateSignals: 9/9 cases passed');
