// Regression coverage for the First Outfit gate (brief v0.9 §6). RN-free,
// import-free module (type-only import erased) so Node runs it directly.
// Run:  node scripts/firstOutfit.test.ts   (Node >= 22 type-stripping)
import assert from 'node:assert/strict';

import {
  countByCategory,
  missingCoreSlots,
} from '../src/screens/onboarding-v2/firstOutfit.ts';

assert.deepEqual(missingCoreSlots({ top: 3, shoes: 1 }), ['bottom'], 'top+shoes, no bottom → missing bottom');
assert.deepEqual(missingCoreSlots({ top: 1, bottom: 1, shoes: 1 }), [], 'separates complete → nothing missing');
assert.deepEqual(missingCoreSlots({ dress: 1, shoes: 1 }), [], 'dress + shoes → nothing missing');
assert.deepEqual(missingCoreSlots({ dress: 1 }), ['shoes'], 'dress but no shoes → prompt shoes, not top');
assert.deepEqual(missingCoreSlots({}), ['top', 'bottom', 'shoes'], 'empty wardrobe → all three core slots');
assert.deepEqual(missingCoreSlots({ top: 2, bottom: 1 }), ['shoes'], 'no shoes → missing shoes');

// --- countByCategory -----------------------------------------------------------
assert.deepEqual(
  countByCategory([{ category: 'top' }, { category: 'top' }, { category: 'shoes' }, { category: null }]),
  { top: 2, shoes: 1 },
  'counts per category, ignores null',
);

console.log('firstOutfit: 13/13 cases passed');
