// Regression coverage for the import-confirm field visibility helper.
// Dependency-free assertions over the pure helper used by ImportConfirmScreen.
// Run:  node scripts/importConfirmFields.test.ts   (Node >= 22 type-stripping)
// Discovered automatically by run-regressions.ts via scripts/*.test.ts glob.
import assert from 'node:assert/strict';

import { visibleImportFields } from '../src/screens/wardrobe/importConfirmFields.ts';

// budget 2 — daytime: all fields visible
const b2 = visibleImportFields(2);
assert.equal(b2.name, true, 'budget 2: name visible');
assert.equal(b2.category, true, 'budget 2: category visible');
assert.equal(b2.color, true, 'budget 2: color visible');
assert.equal(b2.fit, true, 'budget 2: fit visible');

// budget 1 — 20:00-22:00: name + category; color + fit collapsed
const b1 = visibleImportFields(1);
assert.equal(b1.name, true, 'budget 1: name visible');
assert.equal(b1.category, true, 'budget 1: category visible');
assert.equal(b1.color, false, 'budget 1: color collapsed');
assert.equal(b1.fit, false, 'budget 1: fit collapsed');

// budget 0 — 22:00+: name only; category + color + fit all collapsed
const b0 = visibleImportFields(0);
assert.equal(b0.name, true, 'budget 0: name visible');
assert.equal(b0.category, false, 'budget 0: category collapsed');
assert.equal(b0.color, false, 'budget 0: color collapsed');
assert.equal(b0.fit, false, 'budget 0: fit collapsed');

console.log('importConfirmFields: 12/12 cases passed');
