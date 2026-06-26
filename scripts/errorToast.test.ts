// Regression coverage for FE #46 — flag-off (503) on the optional wardrobe-health
// card must NOT surface the global error toast.
//
// No jest/RNTL in this repo, so this is a dependency-free runnable assertion over
// the pure predicate the response interceptor consults. We can't import client.ts
// (axios / expo-constants / zustand load at module scope), so the decision lives
// in src/api/errorToast.ts, which has no runtime imports and loads cleanly under
// Node type-stripping.
// Run:  node scripts/errorToast.test.ts   (Node >= 22 type-stripping)
//
// Lives outside src/ so it is excluded from lint (scoped to src/**). Imports use
// an explicit `.ts` extension and a RELATIVE path — Node type-stripping does not
// resolve `@/` aliases.
import assert from 'node:assert/strict';

import { isErrorToastSilenced } from '../src/api/errorToast.ts';

let passed = 0;
function check(label: string, cond: boolean) {
  assert.ok(cond, label);
  passed += 1;
}

// The wardrobe-health request opts out, so its 503 (flag off) is silenced.
check(
  '503 on opted-out wardrobe-health request is silenced',
  isErrorToastSilenced({ response: { status: 503 }, config: { silentErrorToast: true } }),
);

// Same request silences ANY error (the card omits itself on every failure).
check(
  'network error on opted-out request is silenced',
  isErrorToastSilenced({ config: { silentErrorToast: true } }),
);

// Default callers (no flag) still surface the toast — no behavior change.
check(
  '503 without the flag is NOT silenced',
  !isErrorToastSilenced({ response: { status: 503 }, config: {} }),
);
check('error without config is NOT silenced', !isErrorToastSilenced({ response: { status: 500 } }));
check('explicit false is NOT silenced', !isErrorToastSilenced({ config: { silentErrorToast: false } }));
check('undefined error is NOT silenced', !isErrorToastSilenced(undefined));

// eslint-disable-next-line no-console
console.log(`errorToast: ${passed}/${passed} cases passed`);
