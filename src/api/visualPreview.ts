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

// V3-020 — contract §6.1's fidelity-feedback record, fire-and-forget on the
// `emitRecommendationEvent` precedent: a lightweight learning signal must
// never interrupt the user — no toast, and a swallowed failure (a record lost
// to a blip is acceptable; a red toast over the decision card for it is not).
// The FE-owned `v3_preview_feedback` event — the channel every dashboard
// metric is defined over — is emitted by the caller ON THE TAP, independently
// of this write. Known gap, stated plainly rather than hidden: no BE feature
// has implemented this §6.1 route yet, so today this POST answers 404; the
// path and body are the frozen contract shapes, so when the BE side lands,
// nothing here changes.
export function sendVisualPreviewFeedback(assetId: string, verdict: PreviewFeedbackVerdict): void {
  void apiPost(previewFeedbackPath(assetId), previewFeedbackBody(verdict), undefined, {
    silentErrorToast: true,
  }).catch(() => {
    // Swallowed by design — see docstring.
  });
}
