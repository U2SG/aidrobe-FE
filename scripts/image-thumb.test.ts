// Regression coverage for FE#75 — shared media primitive (ImageThumb) fallback
// behavior for missing media and a failed media load.
//
// No jest/RNTL in this repo, and ImageThumb.tsx loads react-native at module
// scope, so the testable state logic lives in src/components/ui/imageThumbState.ts
// (import-free → loads cleanly under Node type-stripping). Relative path + explicit
// .ts extension (Node type-stripping does not resolve `@/` aliases).
// Run:  node scripts/image-thumb.test.ts   (Node >= 22 type-stripping)
import assert from 'node:assert/strict';

import {
  imageThumbShowsPlaceholder,
  initialImageThumbState,
} from '../src/components/ui/imageThumbState.ts';

let passed = 0;
function check(label: string, cond: boolean) {
  assert.ok(cond, label);
  passed += 1;
}

// Missing media: no uri/source ⇒ start empty, and the placeholder renders.
check('missing media starts in empty state', initialImageThumbState(false) === 'empty');
check('empty state shows the placeholder', imageThumbShowsPlaceholder('empty'));

// Present media: starts loading (skeleton), not the placeholder.
check('present media starts in loading state', initialImageThumbState(true) === 'loading');
check('loading state does not show the placeholder', !imageThumbShowsPlaceholder('loading'));

// Failed media load: falls back to the placeholder (icon / optional retry).
check('failed load shows the placeholder', imageThumbShowsPlaceholder('failed'));

// Loaded: the real image renders, never the placeholder.
check('loaded state does not show the placeholder', !imageThumbShowsPlaceholder('loaded'));

// eslint-disable-next-line no-console
console.log(`image-thumb: ${passed}/${passed} cases passed`);
