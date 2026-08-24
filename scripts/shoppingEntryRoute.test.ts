// Regression for the codex review on FE#141: with `ENABLE_MVP_V2_UI` on, the
// V3 decision screen was unreachable — `MainTabsV2` has no Discover tab, and
// the Ask and Profile tool entries navigated to the V2 `SenseCheck` while
// `ShouldIBuy` was registered only in `DiscoverNavigator`.
//
// The routing decision now lives in one place, so this test covers every shell
// at once; the registration half is asserted structurally below.
// RN-free; run: node scripts/shoppingEntryRoute.test.ts
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { shoppingEntryRoute } from '../src/screens/discover/shoppingEntryRoute.ts';

let passed = 0;
function check(label: string, cond: boolean) {
  assert.ok(cond, label);
  passed += 1;
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p: string) => readFileSync(join(root, p), 'utf-8');

// --- The decision itself ----------------------------------------------------

check('flag on → the V3 decision card', shoppingEntryRoute(true) === 'ShouldIBuy');
check('flag off → the V2 sense-check is intact', shoppingEntryRoute(false) === 'SenseCheck');

// --- Every shopping entry routes through the helper -------------------------
// A hardcoded `navigate('SenseCheck')` in any of these is the FE#141 defect
// returning, so the entries are pinned by source rather than by convention.

for (const file of [
  'src/screens/discover/DiscoverHubScreen.tsx', // V1 shell, Discover tab
  'src/screens/discover/AskAidrobeScreen.tsx', // V2 shell, Ask tab
  'src/screens/profile-v2/ProfileV2Screen.tsx', // V2 shell, Profile tools
]) {
  const src = read(file);
  check(`${file} asks the helper`, src.includes('shoppingEntryRoute('));
  check(
    `${file} has no hardcoded SenseCheck navigation`,
    !/navigate\(\s*'SenseCheck'\s*\)/.test(src),
  );
}

// --- The screen is registered in every stack those entries live in ----------
// Routing to a screen a stack does not declare is a runtime no-op, which is
// exactly how the V2 shell failed silently.

for (const file of [
  'src/core/navigation/DiscoverNavigator.tsx',
  'src/core/navigation/AskNavigator.tsx',
  'src/core/navigation/SettingsNavigator.tsx',
]) {
  check(`${file} registers ShouldIBuy`, /name="ShouldIBuy"/.test(read(file)));
}

// Registering the card is not enough: every screen it navigates TO must exist
// in the same host, or the visible control is an unhandled navigation action —
// the same defect one level down (codex review, FE#154). The destinations are
// read out of the screen itself so a new `navigation.navigate('X')` cannot be
// added without this test noticing.
const cardSrc = read('src/screens/discover/ShouldIBuyScreen.tsx');
const destinations = [...cardSrc.matchAll(/navigation\.navigate\(\s*'([A-Za-z]+)'/g)].map(
  (m) => m[1],
);
check('the card has outgoing navigations to assert', destinations.length >= 2);
for (const host of [
  'src/core/navigation/DiscoverNavigator.tsx',
  'src/core/navigation/AskNavigator.tsx',
  'src/core/navigation/SettingsNavigator.tsx',
]) {
  const src = read(host);
  for (const dest of destinations) {
    check(`${host} registers ${dest}`, new RegExp(`name="${dest}"`).test(src));
  }
}

// Both V2-reachable param lists must declare it too, or the navigate call does
// not type-check for callers typed against them.
const navTypes = read('src/types/navigation.ts');
const list = (name: string) => {
  const start = navTypes.indexOf(`export type ${name}`);
  assert.ok(start !== -1, `${name} exists`);
  return navTypes.slice(start, navTypes.indexOf('export type', start + 1));
};
check('AskStackParamList declares ShouldIBuy', list('AskStackParamList').includes('ShouldIBuy:'));
check(
  'SettingsStackParamList declares ShouldIBuy',
  list('SettingsStackParamList').includes('ShouldIBuy:'),
);

console.log(`shoppingEntryRoute: ${passed}/${passed} cases passed`);
