import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { waitForOutfitVisualAsset } from '../src/api/outfitVisualPolling.ts';
import type { OutfitVisualAsset } from '../src/types/api.ts';

const asset = (generationStatus: string, imageUrl: string | null = null): OutfitVisualAsset => ({
  assetId: 'asset-123',
  generationStatus,
  imageUrl,
  visualType: 'outfit_board',
  errorCode: null,
  errorMessage: null,
});

const noWait = async () => undefined;

let fetchCalls = 0;
assert.equal(
  await waitForOutfitVisualAsset(asset('completed', 'https://signed.example/board.png'), {
    fetchAsset: async () => {
      fetchCalls += 1;
      return asset('processing');
    },
    sleep: noWait,
  }),
  'https://signed.example/board.png',
  'completed producer responses share immediately without polling',
);
assert.equal(fetchCalls, 0, 'completed producer responses do not call GET');

const pollStates = [
  asset('queued'),
  asset('quality_check'),
  asset('completed', 'https://signed.example/ready.png'),
];
let pollIndex = 0;
const sleeps: number[] = [];
assert.equal(
  await waitForOutfitVisualAsset(asset('processing'), {
    fetchAsset: async () => pollStates[pollIndex++]!,
    intervalMs: 750,
    sleep: async (ms) => {
      sleeps.push(ms);
    },
  }),
  'https://signed.example/ready.png',
  'queued, processing, and quality_check continue until a completed asset has a URL',
);
assert.deepEqual(sleeps, [750, 750, 750], 'polling waits between each GET');

let failedFetches = 0;
assert.equal(
  await waitForOutfitVisualAsset(asset('failed'), {
    fetchAsset: async () => {
      failedFetches += 1;
      return asset('completed', 'https://signed.example/unreachable.png');
    },
    sleep: noWait,
  }),
  null,
  'producer failures skip polling and use the caller fallback',
);
assert.equal(failedFetches, 0, 'terminal failures do not call GET');

let timeoutFetches = 0;
assert.equal(
  await waitForOutfitVisualAsset(asset('queued'), {
    fetchAsset: async () => {
      timeoutFetches += 1;
      return asset('processing');
    },
    maxPolls: 2,
    sleep: noWait,
  }),
  null,
  'a bounded poll timeout returns null for the text fallback',
);
assert.equal(timeoutFetches, 2, 'maxPolls bounds network work');

let deadlineFetches = 0;
assert.equal(
  await waitForOutfitVisualAsset(asset('queued'), {
    fetchAsset: async () => {
      deadlineFetches += 1;
      return asset('processing');
    },
    sleep: noWait,
    timeoutMs: 0,
  }),
  null,
  'the total polling deadline returns null before another request can hang',
);
assert.equal(deadlineFetches, 0, 'an expired polling deadline does not start another GET');

assert.equal(
  await waitForOutfitVisualAsset(asset('queued'), {
    fetchAsset: async () => {
      throw new Error('offline');
    },
    sleep: noWait,
  }),
  null,
  'poll network errors return null instead of escaping the share flow',
);

const source = (relativePath: string) =>
  readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), 'utf8');
const api = source('../src/api/outfitVisual.ts');
const today = source('../src/screens/today/TodayScreen.tsx');
const detail = source('../src/screens/today/OutfitDetailScreen.tsx');

assert.match(
  api,
  /apiPost<ServerOutfitVisualAssetResponse>/,
  'share producer uses POST with the visual-asset response contract',
);
assert.match(
  api,
  /`\/v1\/outfits\/\$\{outfitId\}\/share-asset`/,
  'share producer uses the BE #163 path',
);
assert.equal(
  (api.match(/return toOutfitVisualAsset\(data\);/g) ?? []).length,
  2,
  'POST and GET map through the existing unified OutfitVisualAsset shape',
);

for (const [screenName, screen] of [
  ['Today', today],
  ['OutfitDetail', detail],
] as const) {
  assert.match(screen, /createOutfitShareAsset/, `${screenName} creates a share asset`);
  assert.match(screen, /waitForOutfitVisualAsset/, `${screenName} polls the share asset`);
  assert.match(
    screen,
    /shareInFlightRef\.current/,
    `${screenName} has a synchronous double-tap guard`,
  );
  assert.match(
    screen,
    /if \(isMountedRef\.current\) setIsPreparingShare\(false\);/,
    `${screenName} avoids unmounted state updates`,
  );
  assert.match(
    screen,
    /useEffect\(\(\) => \{\s*isMountedRef\.current = true;\s*return \(\) => \{\s*isMountedRef\.current = false;/,
    `${screenName} resets the mounted guard during effect setup before cleanup`,
  );
  assert.ok(
    screen.indexOf('await shareWithAsset') < screen.indexOf("track('outfit_shared'"),
    `${screenName} records analytics only after the native share call`,
  );
}

assert.doesNotMatch(
  today,
  /API_GAP\[FE#15\]/,
  'Today no longer advertises the closed share-asset gap',
);
assert.doesNotMatch(
  detail,
  /downloadNoAsset/,
  'Detail download no longer hard-codes the text-only path',
);
assert.match(
  detail,
  /hasOutfitId && !isLocal/,
  'Detail never POSTs a missing or local showcase outfit id',
);

console.log('outfit-share-asset: producer, polling, fallback, and UI guards passed');
