import type { AxiosRequestConfig } from 'axios';

import { apiGet } from './client';
import type {
  OutfitVisualAsset,
  ServerOutfitVisualAssetResponse,
  ServerWardrobeItemImagesResponse,
  WardrobeItemImages,
} from '@/types/api';

// V4 M10/E5 — visual asset polling + per-item image set.
// E5: `imageUrl` may be a short-lived signed URL (~30 min TTL) on private
// buckets. Do NOT persist it past the session — keep the decoded image in
// memory and re-fetch from these endpoints when the URL expires.
// V3-019 polls this same GET for try-on previews (contract §6.1 keeps it
// ungated for exactly this reason) and passes `{ silentErrorToast: true }` —
// an optional surface's poll blips must not toast over the decision card.
export async function getOutfitVisualAsset(
  assetId: string,
  config?: AxiosRequestConfig,
): Promise<OutfitVisualAsset> {
  const data = await apiGet<ServerOutfitVisualAssetResponse>(
    `/v1/outfit-visual-assets/${assetId}`,
    undefined,
    config,
  );
  return {
    assetId: data.asset_id,
    generationStatus: data.generation_status,
    imageUrl: data.image_url ?? null,
    visualType: data.visual_type ?? null,
    errorCode: data.error_code ?? null,
    errorMessage: data.error_message ?? null,
    // V3-019 — §6.2's additive pair; absent on an older BE, so `?? null`.
    createdAt: data.created_at ?? null,
    expiresAt: data.expires_at ?? null,
  };
}

export async function getItemImages(itemId: string): Promise<WardrobeItemImages> {
  const data = await apiGet<ServerWardrobeItemImagesResponse>(
    `/v1/wardrobe-items/${itemId}/images`,
  );
  return {
    itemId: data.item_id,
    images: data.images.map((img) => ({
      imageType: img.image_type,
      imageUrl: img.image_url ?? null,
    })),
  };
}
