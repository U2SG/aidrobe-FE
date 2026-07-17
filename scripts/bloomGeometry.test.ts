// Regression coverage for the SiriBloomOrb "boxed glow" fix (PR #105/#106):
// the farthest visible glow (ring + breathing halo + blur tail) must stay
// inside the bled canvas at every size the app renders, and the bleed must
// never change the component's layout footprint.
//
// Geometry lives in src/components/ui/bloomGeometry.ts (import-free) because
// SiriBloomOrb.tsx loads Skia/react-native at module scope and can't run
// under Node type-stripping.
// Run:  node scripts/bloomGeometry.test.ts   (Node >= 22)
import assert from 'node:assert/strict';

import { bloomGeometry, maxHaloExtent } from '../src/components/ui/bloomGeometry.ts';

let passed = 0;
function check(label: string, cond: boolean) {
  assert.ok(cond, label);
  passed += 1;
}

// Every size the app actually renders: inline thinking (24), header refetch
// (24), Today loading (32), AIOrb presets sm/md/lg/xl (72/96/120/160).
for (const size of [20, 24, 32, 56, 72, 96, 120, 160]) {
  const g = bloomGeometry(size);
  check(
    `size ${size}: glow (${maxHaloExtent(size).toFixed(1)}) fits inside canvas half (${g.canvas / 2})`,
    maxHaloExtent(size) <= g.canvas / 2,
  );
  check(`size ${size}: layout footprint unchanged (canvas - 2*bleed = size)`, g.canvas - 2 * g.bleed === size);
  check(`size ${size}: drawing is centered`, g.center === g.canvas / 2);
  // The pre-fix failure mode: the glow did NOT fit an unbled size-square canvas.
  check(`size ${size}: bleed is actually needed`, maxHaloExtent(size) > size / 2);
}

console.log(`bloomGeometry: ${passed} checks passed`);
