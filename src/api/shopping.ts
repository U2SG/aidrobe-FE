import { apiGet, apiPost } from './client';
import type {
  SenseCheckBody,
  SenseCheckHistoryEntry,
  SenseCheckResult,
  ServerSenseCheckHistoryItem,
  ServerSenseCheckHistoryResponse,
  ServerSenseCheckResponse,
  ServerSimilarItem,
  SimilarItem,
} from '@/types/api';

// V4 M17 — "should I buy this?" check against the existing wardrobe.
function toSimilar(s: ServerSimilarItem): SimilarItem {
  return { itemId: s.item_id, similarity: s.similarity };
}

export async function senseCheck(body: SenseCheckBody): Promise<SenseCheckResult> {
  const data = await apiPost<ServerSenseCheckResponse>('/v1/shopping/sense-check', {
    image_url: body.imageUrl ?? null,
    source_url: body.sourceUrl ?? null,
  });
  return {
    verdict: data.verdict,
    reason: data.reason,
    similarItems: data.similar_items.map(toSimilar),
    wardrobeGap: data.wardrobe_gap,
    outfitPotential: data.outfit_potential,
  };
}

function toHistoryEntry(item: ServerSenseCheckHistoryItem): SenseCheckHistoryEntry {
  return {
    id: item.sense_check_id,
    verdict: item.verdict,
    reason: item.reason,
    imageUrl: item.image_url ?? null,
    sourceUrl: item.source_url ?? null,
    similarItems: item.similar_items.map(toSimilar),
    wardrobeGap: item.wardrobe_gap,
    outfitPotential: item.outfit_potential,
    createdAt: item.created_at,
  };
}

export async function getSenseCheckHistory(
  limit = 20,
  offset = 0,
): Promise<SenseCheckHistoryEntry[]> {
  const data = await apiGet<ServerSenseCheckHistoryResponse>('/v1/shopping/history', {
    limit,
    offset,
  });
  return data.items.map(toHistoryEntry);
}
