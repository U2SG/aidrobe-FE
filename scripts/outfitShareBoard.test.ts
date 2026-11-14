import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { waitForOutfitVisualAsset } from '../src/api/outfitVisualPolling.ts';
import { canShareServerBoard } from '../src/utils/shareBoardPolicy.ts';
import type { OutfitVisualAsset } from '../src/types/api.ts';

const asset = (generationStatus: string, imageUrl: string | null = null): OutfitVisualAsset => ({
  assetId: 'asset-123',
  generationStatus,
  imageUrl,
  visualType: 'outfit_board',
  errorCode: null,
  errorMessage: null,
  createdAt: null,
  expiresAt: null,
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
const detail = source('../src/screens/today/OutfitDetailScreen.tsx');
const outfitVisual = source('../src/api/outfitVisual.ts');
const shareBoard = source('../src/utils/shareBoard.ts');

// Review FE#159 ①: the board is shared as a downloaded file, never its URL.
assert.match(shareBoard, /downloadAsync\(/, 'the board is downloaded before sharing');
assert.match(shareBoard, /Sharing\.shareAsync\(download\.uri/, 'the local file is what gets shared');
assert.match(shareBoard, /deleteAsync\(/, 'the temporary file is removed');
// Review FE#159 ③: best-effort requests stay silent when text is the fallback.
assert.match(outfitVisual, /share-asset[\s\S]*silentErrorToast: true/, 'the producer request is silent');
assert.match(detail, /getOutfitVisualAsset\(assetId, \{ silentErrorToast: true \}\)/, 'polling is silent');
assert.doesNotMatch(detail, /downloadNoAsset/, 'download no longer hard-codes the text-only path');
assert.ok(
  detail.indexOf('await shareWithAsset(message)') < detail.lastIndexOf("track('outfit_shared'"),
  'text fallback records analytics only after the native share call',
);

// Review FE#159 ②: a locally swapped outfit must not share a picture of the
// old garments; a demo outfit has no server board at all.
assert.equal(canShareServerBoard({ isLocal: false, localReplacementCount: 0 }), true);
assert.equal(canShareServerBoard({ isLocal: false, localReplacementCount: 1 }), false);
assert.equal(canShareServerBoard({ isLocal: true, localReplacementCount: 0 }), false);
