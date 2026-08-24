// V3-019 — regression coverage for the static preview lifecycle: the loop
// that actually stops (acceptance 3, including the unknown-status → failed
// degradation V3-001's evaluator carried to this feature by name), the entry
// gate on the decision card, the refusal vocabulary that lets a no-result
// return to the decision evidence without a dead end (acceptance 4), and the
// frozen §6.1 body that carries no outfit-editor state (acceptance 2, FE
// half — the BE half is `extra="forbid"` answering 422).
// Run:  node scripts/visualPreviewMapping.test.ts   (Node >= 22 type-stripping)
//
// Everything here is reachable without a simulator because the logic lives in
// an RN-free module; what the user actually sees is evidenced separately by
// the recording in .agent-artifacts/v3-019/.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  DEFAULT_PREVIEW_CONCERN,
  IDLE,
  PREVIEW_PENDING_STATUSES,
  PREVIEW_POLL_ATTEMPTS,
  PREVIEW_POLL_INTERVAL_MS,
  classifyGenerationStatus,
  nextPreviewPollDelayMs,
  previewGenerateEntryVisible,
  previewPollErrored,
  previewPolled,
  previewRequestAllowed,
  previewRequestBody,
  previewRequested,
  previewUnavailableCaptionKey,
  previewViewedResult,
  type PreviewPhase,
  type PreviewUnavailableReason,
} from '../src/api/visualPreviewMapping.ts';
import { V3_PREVIEW_CONCERNS } from '../src/utils/v3AnalyticsEvents.ts';
import { zhCN } from '../src/i18n/zh-CN.ts';
import { enUS } from '../src/i18n/en-US.ts';
import type { OutfitVisualAsset } from '../src/types/api.ts';

let checks = 0;
const check = (label: string, fn: () => void) => {
  fn();
  checks += 1;
  console.log(`  ✓ ${label}`);
};

const asset = (over: Partial<OutfitVisualAsset> = {}): OutfitVisualAsset => ({
  assetId: 'asset-1',
  generationStatus: 'processing',
  imageUrl: null,
  visualType: 'static_tryon',
  errorCode: null,
  errorMessage: null,
  createdAt: '2026-08-18T00:00:00Z',
  expiresAt: null,
  ...over,
});

// --- the frozen request body (acceptance 2, FE half) ----------------------------

check('the request body is exactly the frozen §6.1 three-field shape', () => {
  const body = previewRequestBody('overall');
  assert.deepEqual(body, { view_type: 'static_tryon', concern: 'overall', consent: true });
  // Exactly three keys: outfit-editor state (item lists, slots, styling knobs)
  // has no field to ride on. The BE rejects extras with 422; this pins that
  // the client never grows one to smuggle.
  assert.deepEqual(Object.keys(body).sort(), ['concern', 'consent', 'view_type']);
});

check("the client's concern vocabulary is the analytics contract's, verbatim", () => {
  // §6.1's enum and the event enum must never drift apart — `trackV3` would
  // reject `v3_preview_requested` the day they do.
  assert.deepEqual(
    ['volume', 'color', 'length', 'overall'],
    [...V3_PREVIEW_CONCERNS],
  );
  assert.ok((V3_PREVIEW_CONCERNS as readonly string[]).includes(DEFAULT_PREVIEW_CONCERN));
});

// --- the classifier: total, and safe on skew (acceptance 3) ---------------------

check('ready and the three known pending states classify as themselves', () => {
  assert.equal(classifyGenerationStatus('ready'), 'ready');
  for (const s of PREVIEW_PENDING_STATUSES) assert.equal(classifyGenerationStatus(s), 'pending');
});

check('failed and rejected_by_quality_gate are ONE collapsed no-result class', () => {
  // §6.2's frozen degradation rule made structural: no screen can style them
  // apart because no screen can see them apart.
  assert.equal(classifyGenerationStatus('failed'), 'no_result');
  assert.equal(classifyGenerationStatus('rejected_by_quality_gate'), 'no_result');
});

check('an unknown status is terminal, never "keep waiting" (the V3-001 carry-forward)', () => {
  for (const skewed of ['quality_review_v2', 'SUCCEEDED', '', 'processing ', 'Ready']) {
    assert.equal(classifyGenerationStatus(skewed), 'no_result', skewed);
  }
});

// --- the loop stops (acceptance 3) -----------------------------------------------

const generating = (attempt = 0): PreviewPhase => ({
  kind: 'generating',
  assetId: 'asset-1',
  pollAttempt: attempt,
});

check('ready with a URL stops the loop and shows it', () => {
  const next = previewPolled(generating(), asset({ generationStatus: 'ready', imageUrl: 'https://signed/x.png' }));
  assert.deepEqual(next, { kind: 'ready', assetId: 'asset-1', imageUrl: 'https://signed/x.png' });
});

check('ready WITHOUT a URL is a no-result, not a blank "ready"', () => {
  // A ready row whose signed URL did not materialize has nothing to show;
  // "ready" with no image would be the dead end §3.6 forbids.
  const next = previewPolled(generating(), asset({ generationStatus: 'ready', imageUrl: null }));
  assert.deepEqual(next, { kind: 'no_result' });
});

check('failed, rejected and unknown statuses all stop the loop the same way', () => {
  for (const status of ['failed', 'rejected_by_quality_gate', 'something_new']) {
    assert.deepEqual(previewPolled(generating(5), asset({ generationStatus: status })), {
      kind: 'no_result',
    });
  }
});

check('a pending status keeps watching and charges one attempt', () => {
  const next = previewPolled(generating(3), asset({ generationStatus: 'quality_check' }));
  assert.deepEqual(next, { kind: 'generating', assetId: 'asset-1', pollAttempt: 4 });
});

check('the spent window hands the wait to the background — still_working, not failure', () => {
  // §9.5: the window bounds the WATCHING, not the render. Calling a live
  // render dead would be the failure copy lying.
  const next = previewPolled(generating(PREVIEW_POLL_ATTEMPTS - 1), asset());
  assert.deepEqual(next, { kind: 'still_working', assetId: 'asset-1' });
});

check('the window arithmetic: delay before every attempt but the last', () => {
  assert.equal(nextPreviewPollDelayMs(0), PREVIEW_POLL_INTERVAL_MS);
  assert.equal(nextPreviewPollDelayMs(PREVIEW_POLL_ATTEMPTS - 1), PREVIEW_POLL_INTERVAL_MS);
  assert.equal(nextPreviewPollDelayMs(PREVIEW_POLL_ATTEMPTS), null);
});

check('one failed GET costs one attempt, not the preview', () => {
  const next = previewPollErrored(generating(0));
  assert.deepEqual(next, { kind: 'generating', assetId: 'asset-1', pollAttempt: 1 });
  // ...and a persistently unreachable server drains into still_working — the
  // copy that says "come back later" — never into the failure copy.
  assert.deepEqual(previewPollErrored(generating(PREVIEW_POLL_ATTEMPTS - 1)), {
    kind: 'still_working',
    assetId: 'asset-1',
  });
});

check('a poll landing on a non-generating phase changes nothing (stale fence)', () => {
  const settled: PreviewPhase = { kind: 'no_result' };
  assert.equal(previewPolled(settled, asset({ generationStatus: 'ready', imageUrl: 'x' })), settled);
  assert.equal(previewPollErrored(settled), settled);
});

check('previewRequested enters the loop at attempt zero', () => {
  assert.deepEqual(previewRequested('a-2'), { kind: 'generating', assetId: 'a-2', pollAttempt: 0 });
});

// --- the entry gate on the decision card -----------------------------------------

check('the generate entry needs BOTH a ready reference and a stated visual need', () => {
  assert.equal(previewGenerateEntryVisible({ visualNeed: 'recommended', start: 'already_ready' }), true);
  assert.equal(previewGenerateEntryVisible({ visualNeed: 'helpful', start: 'already_ready' }), true);
  // visual_need `none` = V3-007 says the evidence already answers it; unknown
  // wire values were coerced to `none` upstream, so this branch covers skew too.
  assert.equal(previewGenerateEntryVisible({ visualNeed: 'none', start: 'already_ready' }), false);
});

check('the generate entry and the V3-015 setup entry are disjoint by construction', () => {
  // The setup entry serves new_photo / consent_existing_candidate; this one
  // serves already_ready only. already_preparing gets neither: a button that
  // answers "wait" leads nowhere real.
  for (const start of ['new_photo', 'consent_existing_candidate', 'already_preparing', 'blocked'] as const) {
    assert.equal(previewGenerateEntryVisible({ visualNeed: 'recommended', start }), false, start);
  }
});

// --- no-result returns to the decision evidence (acceptance 4) -------------------

check('the viewed event: ready → shown, no_result → fallback, nothing else emits', () => {
  assert.equal(previewViewedResult({ kind: 'ready', assetId: 'a', imageUrl: 'u' }), 'shown');
  assert.equal(previewViewedResult({ kind: 'no_result' }), 'fallback');
  assert.equal(previewViewedResult(IDLE), null);
  assert.equal(previewViewedResult({ kind: 'still_working', assetId: 'a' }), null);
  assert.equal(previewViewedResult({ kind: 'unavailable', reason: 'error' }), null);
});

check('terminal refusals offer no retry treadmill; transient ones stay available', () => {
  assert.equal(previewRequestAllowed(IDLE), true);
  assert.equal(previewRequestAllowed({ kind: 'still_working', assetId: 'a' }), true);
  assert.equal(previewRequestAllowed({ kind: 'unavailable', reason: 'error' }), true);
  // §6.3 serves the same rejected asset from cache — "try again" would replay
  // the failure copy at the user (§3.6: 不要求用户反复重试).
  assert.equal(previewRequestAllowed({ kind: 'no_result' }), false);
  assert.equal(previewRequestAllowed({ kind: 'unavailable', reason: 'quota_exhausted' }), false);
  assert.equal(previewRequestAllowed({ kind: 'unavailable', reason: 'no_preview_possible' }), false);
  // V3-026: the retry allowance is spent for THIS generation and no press can
  // change that, so it belongs with the answers rather than the obstacles.
  assert.equal(previewRequestAllowed({ kind: 'unavailable', reason: 'retry_exhausted' }), false);
});

check('every refusal maps to a calm caption or deliberate silence, and the copy exists', () => {
  const reasons: PreviewUnavailableReason[] = [
    'avatar_not_ready',
    'no_preview_possible',
    'quota_exhausted',
    'retry_exhausted',
    'feature_unavailable',
    'error',
  ];
  for (const reason of reasons) {
    const key = previewUnavailableCaptionKey(reason);
    if (key !== null) {
      assert.ok(zhCN[key], `zh-CN missing ${key}`);
      assert.ok(enUS[key], `en-US missing ${key}`);
    }
  }
  // The two silent ones, pinned: flag-off self-hides (contract §2 rule 2) and
  // a stale avatar probe defers to the setup entry's surface.
  assert.equal(previewUnavailableCaptionKey('feature_unavailable'), null);
  assert.equal(previewUnavailableCaptionKey('avatar_not_ready'), null);
});

check('the §9.5 lifecycle copy exists in both locales and stays honest', () => {
  for (const key of [
    'should_i_buy.preview.generate',
    'should_i_buy.preview.generateHint',
    'should_i_buy.preview.generating',
    'should_i_buy.preview.noResult',
    'should_i_buy.preview.stillWorking',
    'should_i_buy.preview.checkAgain',
    'should_i_buy.preview.readyAlt',
  ] as const) {
    assert.ok(zhCN[key], `zh-CN missing ${key}`);
    assert.ok(enUS[key], `en-US missing ${key}`);
  }
  // §9.5 verbatim in zh-CN: the status line, and the failure copy that points
  // back at the wardrobe judgment (acceptance 4's user-facing half).
  assert.equal(zhCN['should_i_buy.preview.generating'], '正在把这套和你的衣橱搭在一起…');
  assert.ok(zhCN['should_i_buy.preview.noResult'].includes('衣橱判断仍然有效'));
  // No countdown, no percentage, no fit/size claim anywhere in the lifecycle
  // copy (§9.5 / §16) — in either locale.
  for (const [k, v] of [...Object.entries(zhCN), ...Object.entries(enUS)]) {
    if (!k.startsWith('should_i_buy.preview.')) continue;
    assert.ok(!/\d+\s*(秒|s\b|%)/i.test(v), `${k} promises a time or percentage`);
    assert.ok(!/尺码|合身|面料|垂坠|exact fit|true to size/i.test(v), `${k} overclaims`);
  }
});

// --- the screen wiring, structurally ---------------------------------------------

const SCREEN_SOURCE = readFileSync(
  new URL('../src/screens/discover/ShouldIBuyScreen.tsx', import.meta.url),
  'utf8',
);

check('the screen consumes the mapping, not its own status strings', () => {
  // The loop's stop conditions live in ONE place. A screen that re-tested
  // `generationStatus === 'failed'` would re-open the unknown-status spin.
  assert.ok(SCREEN_SOURCE.includes('previewPolled('));
  assert.ok(SCREEN_SOURCE.includes('previewPollErrored('));
  assert.ok(SCREEN_SOURCE.includes('previewGenerateEntryVisible('));
  assert.ok(!/generationStatus\s*===/.test(SCREEN_SOURCE));
});

check('the poll is silenced — an optional surface must not toast over the card', () => {
  assert.ok(/getOutfitVisualAsset\(assetId,\s*\{\s*silentErrorToast:\s*true\s*\}\)/.test(SCREEN_SOURCE));
});

check('the preview slot never persists a signed URL', () => {
  // Contract §3 / repo rule: image URLs are short-lived; the only use of
  // `imageUrl` in the preview section is as an <Image> source.
  assert.equal(/(?:AsyncStorage|setItem|persist)\s*\(/.test(SCREEN_SOURCE), false);
});

console.log(`\nvisualPreviewMapping: ${checks} checks passed`);
