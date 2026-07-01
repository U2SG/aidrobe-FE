// Regression coverage for the First Outfit gate (brief v0.9 §6). RN-free,
// import-free module (type-only import erased) so Node runs it directly.
// Run:  node scripts/firstOutfit.test.ts   (Node >= 22 type-stripping)
import assert from 'node:assert/strict';

import {
  countByCategory,
  deriveFirstOutfitState,
  missingCoreSlots,
} from '../src/screens/onboarding-v2/firstOutfit.ts';

// --- deriveFirstOutfitState ----------------------------------------------------
assert.equal(
  deriveFirstOutfitState({ isLoading: true, isError: false, feasibleOutfitCount: 0 }),
  'processing',
  'loading → processing',
);
assert.equal(
  deriveFirstOutfitState({ isLoading: false, isError: true, feasibleOutfitCount: 3 }),
  'failed',
  'error → failed (even with outfits)',
);
assert.equal(
  deriveFirstOutfitState({ isLoading: false, isError: false, todayState: 'insufficient_items', feasibleOutfitCount: 1 }),
  'no_outfit',
  'insufficient_items → no_outfit (never a faked outfit)',
);
assert.equal(
  deriveFirstOutfitState({ isLoading: false, isError: false, feasibleOutfitCount: 0 }),
  'no_outfit',
  'zero feasible → no_outfit',
);
assert.equal(
  deriveFirstOutfitState({ isLoading: false, isError: false, feasibleOutfitCount: 1 }),
  'single_outfit',
  'one feasible → single_outfit (no failing swap)',
);
assert.equal(
  deriveFirstOutfitState({ isLoading: false, isError: false, feasibleOutfitCount: 4 }),
  'ready',
  'multiple feasible → ready',
);

// --- missingCoreSlots ----------------------------------------------------------
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
