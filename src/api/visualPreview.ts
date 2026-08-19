import { apiPost } from './client';
import type { PreviewFeedbackVerdict } from './previewFeedbackMapping';
import { previewFeedbackBody, previewFeedbackPath } from './previewFeedbackMapping';
import type { PreviewConcern } from './visualPreviewMapping';
import { previewRequestBody } from './visualPreviewMapping';
import type { ServerVisualPreviewResponse, VisualPreviewCreated } from '@/types/api';

// V3-019 — the create half of the static preview lifecycle (contract §6.1).
// The poll half is the existing M10 `getOutfitVisualAsset` in outfitVisual.ts:
// one GET serves both outfit boards and try-on previews, which is exactly why
// the contract kept it ungated. Errors are classified by the caller through
// `toPreviewUnavailableReason` — this surface is optional, so nothing here may
// toast (`silentErrorToast`): its failures must never appear on a screen the
// user opened for a purchase judgment.
export async function requestVisualPreview(
  decisionId: string,
  concern: PreviewConcern,
): Promise<VisualPreviewCreated> {
  const data = await apiPost<ServerVisualPreviewResponse>(
    `/v1/wardrobe-decisions/${decisionId}/visual-preview`,
    previewRequestBody(concern),
    undefined,
    { silentErrorToast: true },
  );
  return { assetId: data.asset_id, generationStatus: data.generation_status };
}

// V3-020 — contract §6.1's fidelity-feedback record, and the DURABLE half of
// the two channels (see `previewFeedbackMapping.ts`): V3-024 implements this
// route, so a tap writes one `static_preview_feedback` row per asset. The
// FE-owned `v3_preview_feedback` event is emitted by the caller on the tap,
// independently of this write, and terminates in a dev console.log until a
// dispatcher is registered — so this POST, not that event, is what makes the
// thanks line honest.
//
// Fire-and-forget on the `emitRecommendationEvent` precedent: a lightweight
// learning signal must never interrupt the user — no toast, and a swallowed
// failure (a record lost to a blip is acceptable; a red toast over the decision
// card for it is not). The non-200s that remain, none of which the user can act
// on: 503 while the BE's ENABLE_V3_STATIC_TRYON is off, and 404 for an asset
// that is not the caller's own `static_tryon` one — including the version-skew
// case of a client newer than its backend.
export function sendVisualPreviewFeedback(assetId: string, verdict: PreviewFeedbackVerdict): void {
  void apiPost(previewFeedbackPath(assetId), previewFeedbackBody(verdict), undefined, {
    silentErrorToast: true,
  }).catch(() => {
    // Swallowed by design — see docstring.
  });
}
