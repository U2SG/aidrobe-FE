// Regression coverage for FE#75 — shared media primitive (ImageThumb) fallback
// behavior for missing media and a failed media load.
//
// No jest/RNTL in this repo, and ImageThumb.tsx loads react-native at module
// scope, so the testable state logic lives in src/components/ui/imageThumbState.ts
// (import-free → loads cleanly under Node type-stripping). Relative path + explicit
// .ts extension (Node type-stripping does not resolve `@/` aliases).
// Run:  node scripts/image-thumb.test.ts   (Node >= 22 type-stripping)
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  imageThumbLoaderHandlers,
  imageThumbShowsPlaceholder,
  initialImageThumbState,
  type ImageThumbState,
} from '../src/components/ui/imageThumbState.ts';

let passed = 0;
function check(label: string, cond: boolean) {
  assert.ok(cond, label);
  passed += 1;
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p: string) => readFileSync(join(root, p), 'utf-8');

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

// --- FE#143: the loader callbacks must be referentially stable ---------------
//
// react-native-web's <Image> lists onLoadStart/onLoad/onError in its loader
// effect's dependency array, so a fresh closure per render re-arms the effect
// and its setState schedules the next render. The browser measurement of that
// loop: 5,544 image loads for ONE 64px thumbnail, 1,089 of them in a 6-second
// idle window with nobody touching the screen
// (.agent-artifacts/v3-025/driver-before.log).
//
// Two halves, because neither alone catches a regression. The runtime half
// pins WHAT the callbacks do; the source half pins that the component still
// holds them behind a dependency-free memo and passes them by reference —
// which is the part that actually stops the loop, and the part a refactor can
// silently undo without any test noticing.

// Runtime: each callback maps to the state it is named for, so making them
// stable did not change the loading/loaded/error behavior.
const seenStates: ImageThumbState[] = [];
const handlers = imageThumbLoaderHandlers((next) => seenStates.push(next));
handlers.onLoadStart();
handlers.onLoad();
handlers.onError();
check(
  'the loader callbacks drive loading → loaded → failed',
  seenStates.join(',') === 'loading,loaded,failed',
);

// The memo owns the stability, not a module-level cache: two mounts must get
// their own closures, or one thumbnail's load would drive another's state.
const a = imageThumbLoaderHandlers(() => {});
const b = imageThumbLoaderHandlers(() => {});
check('each call returns its own handlers (no shared module-level cache)', a.onLoad !== b.onLoad);
// Within one call the three are distinct functions, i.e. really three handlers.
check(
  'the three handlers are distinct',
  new Set([a.onLoadStart, a.onLoad, a.onError]).size === 3,
);

// Source: the <Image> element must receive the three as bare references held by
// a dependency-free memo. An inline arrow in any of them is the defect back.
const thumbSrc = read('src/components/ui/ImageThumb.tsx');
// Every `<Image ... />` in the file, then the one that wires the loader — the
// file's own header comment mentions `<Image>` in prose, so a first-match
// probe reads the comment instead of the element.
const imageEl =
  [...thumbSrc.matchAll(/<Image\b[\s\S]*?\/>/g)]
    .map((m) => m[0])
    .find((el) => el.includes('onLoad')) ?? '';
check('the <Image> element is locatable in the source', imageEl.length > 0);
for (const prop of ['onLoadStart', 'onLoad', 'onError']) {
  const value = new RegExp(`${prop}=\\{([^}]*)\\}`).exec(imageEl)?.[1] ?? '';
  check(`<Image> passes ${prop}`, value.length > 0);
  check(
    `<Image> ${prop} is a stable reference, not a per-render closure`,
    !value.includes('=>') && !value.includes('('),
  );
  check(
    `<Image> ${prop} comes from the memoized loader`,
    value.trim().startsWith('loader.'),
  );
}
const memoDeps = /useMemo\(\s*\(\)\s*=>\s*imageThumbLoaderHandlers\(setState\)\s*,\s*\[([^\]]*)\]/
  .exec(thumbSrc)?.[1];
check('the loader handlers are held in a useMemo', memoDeps !== undefined);
check(
  'that useMemo has NO dependencies, so the identities never change',
  (memoDeps ?? 'x').trim() === '',
);

// eslint-disable-next-line no-console
console.log(`image-thumb: ${passed}/${passed} cases passed`);
