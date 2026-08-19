// V3-020 — the ready preview's honest-boundary layer, as pure logic
// (contract §6.1 feedback body / §7 boundary minimums / V3_SPEC §5.4 layers
// 4–5, §14). Runtime-import-free — every import is type-only and therefore
// erased — so `scripts/previewFeedbackMapping.test.ts` loads this module
// directly in Node, the `visualPreviewMapping.ts` pattern. The screen renders
// these states; it decides nothing.
//
// ## One vocabulary, two channels — and which of them is the durable one
//
// A verdict travels twice: as contract §6.1's
// `POST /v1/outfit-visual-assets/{asset_id}/feedback` body, and as the
// FE-owned `v3_preview_feedback` analytics event. Both are frozen to the same
// three strings. Their fates today are NOT the same, and the difference is
// worth stating instead of implying:
//
//   - The §6.1 POST is the durable record. V3-024 implements it
//     (`static_preview_feedback`, one row per asset, last write wins), so a
//     tap persists and V3-023's looks-like-me / garment-wrong rates are
//     computable per provider/model/prompt version off that table.
//   - The analytics event is NOT a live sink yet. `setAnalyticsDispatcher` is
//     never called anywhere in `src` (pre-existing V1-Slim infrastructure,
//     shared with every other V3 event), so `trackV3` terminates in a
//     `__DEV__` console.log. It is emitted here because the contract says this
//     surface owns that event, not because anything currently reads it.
//
// So: the honest claim for this control is that the BACKEND persists the
// verdict. No copy, comment or evidence line in this feature may promise a
// dashboard the analytics channel cannot feed today.
//
// The verdict list below is declared locally so this module stays
// Node-loadable (a runtime `@/` import breaks the direct-load test path); the
// regression test pins it deep-equal to `V3_FEEDBACK_VERDICTS`, so an edit to
// either side without the other fails the build — the same guard
// `PREVIEW_CONCERNS` rides.
//
// ## Why feedback stays single-shot, now that the server dedupes
//
// The original reason was the metric denominator: `looks_like_me_rate` as
// `v3_preview_feedback[verdict=looks_like_me] / all v3_preview_feedback`
// double-counts a render whose user re-answers. That argument now leans on the
// analytics channel described above, and V3-024's durable side cannot
// double-count at all — it is unique on `asset_id` with last-write-wins, and
// its contract §6.1 note explicitly allows a client to re-submit.
//
// The lock stays anyway, deliberately, for a product reason rather than a
// metric one: a P0 surface with no undo affordance should not silently accept
// a second answer as a correction. Re-answering is a real affordance (chips
// that stay live, a "changed your mind?" state) and P0 does not ship one; a
// row that quietly flips because a finger landed twice is worse than a locked
// row. When that affordance is designed, this is the single function to relax
// (`previewFeedbackAllowed`) and the server side already supports it.
// (Aspects stay off the P0 surface: the contract marks them optional, the
// acceptance names only the three verdicts, and "lightweight" is in the
// feature description.)

import type { I18nKey } from '@/i18n';
import type { V3FeedbackVerdict } from '@/utils/v3AnalyticsEvents';

/** The frozen three-verdict vocabulary — §6.1's and `v3_preview_feedback`'s
 *  (pinned identical by the regression test; see module note). Typed against
 *  the analytics union so a divergence is also a compile error. */
export const PREVIEW_FEEDBACK_VERDICTS: readonly V3FeedbackVerdict[] = [
  'looks_like_me',
  'not_like_me',
  'garment_wrong',
] as const;
export type PreviewFeedbackVerdict = V3FeedbackVerdict;

/** §6.1's feedback path. The asset id, not the decision id: fidelity feedback
 *  is about one render, and the cached asset may outlive the decision page
 *  that first showed it. */
export function previewFeedbackPath(assetId: string): string {
  return `/v1/outfit-visual-assets/${assetId}/feedback`;
}

/** The frozen §6.1 body. `aspects` is deliberately absent, not empty — the
 *  contract marks it optional, and omitting the key entirely is the honest
 *  encoding of "the P0 surface never asked". */
export interface PreviewFeedbackRequestBody {
  verdict: PreviewFeedbackVerdict;
}

export function previewFeedbackBody(verdict: PreviewFeedbackVerdict): PreviewFeedbackRequestBody {
  return { verdict };
}

/** One way, no way back — see the module note on the metric denominator. */
export type PreviewFeedbackState =
  | { kind: 'open' }
  | { kind: 'sent'; verdict: PreviewFeedbackVerdict };

export const FEEDBACK_OPEN: PreviewFeedbackState = { kind: 'open' };

export function previewFeedbackAllowed(state: PreviewFeedbackState): boolean {
  return state.kind === 'open';
}

export function previewFeedbackSent(verdict: PreviewFeedbackVerdict): PreviewFeedbackState {
  return { kind: 'sent', verdict };
}

/** Each verdict's chip label. A switch rather than a template so a verdict
 *  added to the frozen list without copy is a compile error here, not a raw
 *  key on screen. */
export function previewFeedbackLabelKey(verdict: PreviewFeedbackVerdict): I18nKey {
  switch (verdict) {
    case 'looks_like_me':
      return 'should_i_buy.preview.feedback.looksLikeMe';
    case 'not_like_me':
      return 'should_i_buy.preview.feedback.notLikeMe';
    case 'garment_wrong':
      return 'should_i_buy.preview.feedback.garmentWrong';
  }
}

/**
 * §5.4 layer 5's fixed sentence, client-side. The server already renders the
 * same copy into every decision's `boundary_note` (V3-007), and the card shows
 * that below the preview area — but the wire type allows null, and a ready
 * RENDER on screen with no boundary line is exactly the overstatement §7
 * forbids ("every preview carries the fixed boundary note"). This key is the
 * unconditional fallback: the layer-5 slot renders `boundary_note ?? this`,
 * so the sentence's presence stops depending on the server having sent it.
 */
export const PREVIEW_BOUNDARY_FALLBACK_KEY: I18nKey = 'should_i_buy.boundaryFallback';
