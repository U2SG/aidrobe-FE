// Regression coverage for the recommendation-impression dedupe helper (FE#130
// — Today decision-loop event attribution). Dependency-free assertions over
// the pure helpers the useRecommendationImpression hook reads from. Run:
//   node scripts/recommendationImpressionDedupe.test.ts   (Node >= 22 type-stripping)
// Lives outside src/ so it's excluded from `npm run lint` (scoped to src/**).
import assert from 'node:assert/strict';

import {
  buildImpressionKey,
  createImpressionDedupeStore,
} from '../src/hooks/recommendationImpressionDedupe.ts';

const identity = {
  recommendationId: 'rec-1',
  revision: 1,
  outfitId: 'outfit-1',
  sourceSurface: 'today',
};

// --- buildImpressionKey ---------------------------------------------------
assert.equal(
  buildImpressionKey(identity),
  'rec-1:1:outfit-1:today',
  'a full identity builds a stable, human-inspectable key',
);
assert.equal(
  buildImpressionKey({ ...identity, recommendationId: null }),
  null,
  'null recommendation_id (legacy/flag-off payload) → skip (no key)',
);
assert.equal(
  buildImpressionKey({ ...identity, recommendationId: undefined }),
  null,
  'undefined recommendation_id → skip (no key)',
);
assert.equal(
  buildImpressionKey({ ...identity, revision: null }),
  null,
  'null revision → skip (no key)',
);
assert.equal(
  buildImpressionKey({ ...identity, revision: 0 }),
  'rec-1:0:outfit-1:today',
  'revision 0 is a valid revision, not treated as missing',
);
assert.equal(
  buildImpressionKey({ ...identity, outfitId: null }),
  null,
  'null outfit_id (no real outfit card) → skip (no key)',
);
assert.notEqual(
  buildImpressionKey(identity),
  buildImpressionKey({ ...identity, sourceSurface: 'ask' }),
  'source_surface is part of the identity — different surface, different key',
);

// --- createImpressionDedupeStore ------------------------------------------
{
  const store = createImpressionDedupeStore();
  const key = buildImpressionKey(identity);
  assert.ok(key, 'sanity: key is non-null for a full identity');

  assert.equal(store.shouldEmit(key!), true, 'first impression for a key emits');
  assert.equal(store.shouldEmit(key!), false, 'duplicate check for the same key is suppressed');
  assert.equal(store.shouldEmit(key!), false, 'still suppressed on a third check');

  const nextRevisionKey = buildImpressionKey({ ...identity, revision: 2 });
  assert.ok(nextRevisionKey);
  assert.equal(
    store.shouldEmit(nextRevisionKey!),
    true,
    'a new revision is a new key and re-emits, even though the prior revision already fired',
  );
  assert.equal(
    store.shouldEmit(nextRevisionKey!),
    false,
    'the new revision itself is then deduped on repeat checks',
  );

  store.reset();
  assert.equal(store.shouldEmit(key!), true, 'reset() clears seen keys (test isolation escape hatch)');
}

// --- store instances are independent (no shared hidden state) -------------
{
  const storeA = createImpressionDedupeStore();
  const storeB = createImpressionDedupeStore();
  const key = buildImpressionKey(identity)!;
  assert.equal(storeA.shouldEmit(key), true);
  assert.equal(storeB.shouldEmit(key), true, 'a fresh store has no memory of another store instance');
}

console.log('recommendationImpressionDedupe: 12/12 cases passed');
