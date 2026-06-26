// Regression coverage for FE #47 — Today must not dress an insufficient/empty
// wardrobe up as a wearable recommendation.
//
// Dependency-free runnable assertion over the pure board-mode helper the screen
// renders from. Run:  node scripts/todayBoard.test.ts   (Node >= 22 type-stripping)
// Lives outside src/ so it's excluded from `npm run lint` (scoped to src/**).
import assert from 'node:assert/strict';

import { todayBoardMode } from '../src/screens/today/todayBoard.ts';

// insufficient_items forces the empty UI even if an outfit object rode along —
// this is the P0 fix: no local-showcase shown as actionable.
assert.equal(
  todayBoardMode({ state: 'insufficient_items', hasApiOutfit: true }),
  'insufficient',
  'insufficient_items must force the empty/insufficient board even with an outfit',
);

// Candidate-card guard: the SAME helper gates the compact candidate cards, so an
// insufficient wardrobe with a variant outfit still riding along must resolve to
// a non-'real' (empty) candidate — never a normal recommendation card.
assert.notEqual(
  todayBoardMode({ state: 'insufficient_items', hasApiOutfit: true }),
  'real',
  'a candidate must be empty (non-real) under insufficient_items even with an outfit',
);

// No real outfit (new/empty wardrobe, or active variant absent) → honest empty.
assert.equal(
  todayBoardMode({ state: null, hasApiOutfit: false }),
  'empty',
  'no real outfit must render the empty board (no showcase pieces)',
);

// A real API outfit for the active variant → the actionable 'real' board.
assert.equal(
  todayBoardMode({ state: 'ok', hasApiOutfit: true }),
  'real',
  'a real API outfit must render the actionable board',
);

// Guard: missing state + no outfit is still empty (not actionable).
assert.equal(todayBoardMode({ hasApiOutfit: false }), 'empty', 'missing state + no outfit → empty');

console.log('todayBoard: 5/5 cases passed');
