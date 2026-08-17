import { apiPost } from './client';
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
