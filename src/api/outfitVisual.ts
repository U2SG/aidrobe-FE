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
export async function getOutfitVisualAsset(assetId: string): Promise<OutfitVisualAsset> {
  const data = await apiGet<ServerOutfitVisualAssetResponse>(
    `/v1/outfit-visual-assets/${assetId}`,
  );
  return {
    assetId: data.asset_id,
    generationStatus: data.generation_status,
    imageUrl: data.image_url ?? null,
    visualType: data.visual_type ?? null,
    errorCode: data.error_code ?? null,
    errorMessage: data.error_message ?? null,
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
