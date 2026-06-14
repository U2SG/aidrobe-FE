import { apiPost } from './client';
import type {
  CreateOotdPosterBody,
  OotdPosterResult,
  ServerCreateOotdPosterResponse,
} from '@/types/api';

// V4 — stylized OOTD poster from a wear selfie. Body images go to a third-party
// model, so `consent` MUST be true (set it after showing the consent +
// "AI preview only" notice). Poll the asset via getOutfitVisualAsset(assetId).
export async function createOotdPoster(body: CreateOotdPosterBody): Promise<OotdPosterResult> {
  const data = await apiPost<ServerCreateOotdPosterResponse>('/v1/ootd-posters', {
    ootd_image_url: body.ootdImageUrl ?? null,
    wear_history_id: body.wearHistoryId ?? null,
    template_id: body.templateId ?? 'minimal',
    consent: body.consent,
  });
  return {
    assetId: data.asset_id,
    generationStatus: data.generation_status,
    disclaimer: data.disclaimer,
  };
}
