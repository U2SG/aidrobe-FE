// Regression coverage for FE #41 — Sense-Check history blank thumbnails.
//
// No jest/RNTL is installed in this repo, so this is a dependency-free runnable
// assertion over the pure render-decision helper the screen renders from.
// Run:  node scripts/senseCheckHistory.test.ts   (Node >= 22 type-stripping)
//
// Lives outside src/ so it is excluded from `npm run lint` (scoped to src/**);
// it stays tsc-clean and is genuinely executed.
import assert from 'node:assert/strict';

import { historyThumbState } from '../src/screens/discover/senseCheckHistory.ts';

// Case 1 (required): history item with a MISSING image URL → fallback.
assert.equal(historyThumbState(null, false), 'fallback', 'null URL must render the fallback');

// Case 2 (required): history item with a VALID image URL → renders the image.
assert.equal(
  historyThumbState('https://cdn.example.com/items/x.jpg', false),
  'image',
  'a valid URL must render the image',
);

// Guard: a valid URL whose <Image> errored (e.g. expired/403 signed URL) also
// degrades to the fallback rather than a blank box.
assert.equal(
  historyThumbState('https://cdn.example.com/items/x.jpg', true),
  'fallback',
  'an errored image must degrade to the fallback',
);

// eslint-disable-next-line no-console
console.log('senseCheckHistory: 3/3 cases passed');
