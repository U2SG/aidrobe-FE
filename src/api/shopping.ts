import { apiGet, apiPost } from './client';
import type {
  PurchaseEvaluation,
  SenseCheckBody,
  SenseCheckHistoryEntry,
  SenseCheckResult,
  ServerPurchaseEvaluation,
  ServerSenseCheckHistoryItem,
  ServerSenseCheckHistoryResponse,
  ServerSenseCheckResponse,
  ServerSimilarItem,
  ServerI18nMessage,
  SimilarItem,
} from '@/types/api';

// V4 M17 — "should I buy this?" check against the existing wardrobe.
function toSimilar(s: ServerSimilarItem): SimilarItem {
  return { itemId: s.item_id, similarity: s.similarity };
}

// BE#69 — map the optional purchase-evaluation block (snake → camel). Null/absent
// when the server has ENABLE_PURCHASE_EVALUATOR off, so the FE shows no extra cards.
function toEvaluation(e: ServerPurchaseEvaluation | null | undefined): PurchaseEvaluation | null {
  if (!e) return null;
  return {
    confidence: e.confidence ?? null,
    redundancy: e.redundancy
      ? {
          level: e.redundancy.level,
          similarOwnedItems: e.redundancy.similar_owned_items.map((s) => ({
            itemId: s.item_id,
            similarity: s.similarity,
            reason: s.reason,
          })),
        }
      : null,
    wardrobeGapDetail: (e.wardrobe_gap_detail ?? []).map((g) => ({
      category: g.category,
      severity: g.severity,
    })),
    factors: (e.factors ?? []).map((f) => ({
      factor: f.factor,
      detail: f.detail,
      direction: f.direction,
    })),
    costPerWearHint: e.cost_per_wear_hint ?? null,
  };
}

function toI18nMessage(message: ServerI18nMessage | null | undefined) {
  if (!message) return null;
  return {
    key: message.key,
    params: message.params,
    fallbackText: message.fallback_text,
  };
}

export async function senseCheck(body: SenseCheckBody): Promise<SenseCheckResult> {
  const data = await apiPost<ServerSenseCheckResponse>('/v1/shopping/sense-check', {
    image_url: body.imageUrl ?? null,
    source_url: body.sourceUrl ?? null,
  });
  return {
    verdict: data.verdict,
    reason: data.reason,
    displayReason: toI18nMessage(data.display_reason),
    fallbackText: data.fallback_text ?? data.display_reason?.fallback_text ?? null,
    similarItems: data.similar_items.map(toSimilar),
    similarItemCount: data.similar_item_count ?? null,
    wardrobeGap: data.wardrobe_gap,
    outfitPotential: data.outfit_potential,
    pairableCount: data.pairable_count ?? null,
    evaluation: toEvaluation(data.evaluation),
  };
}

function toHistoryEntry(item: ServerSenseCheckHistoryItem): SenseCheckHistoryEntry {
  return {
    id: item.sense_check_id,
    verdict: item.verdict,
    reason: item.reason,
    displayReason: toI18nMessage(item.display_reason),
    fallbackText: item.fallback_text ?? item.display_reason?.fallback_text ?? null,
    imageUrl: item.image_url ?? null,
    sourceUrl: item.source_url ?? null,
    similarItems: item.similar_items.map(toSimilar),
    similarItemCount: item.similar_item_count ?? null,
    wardrobeGap: item.wardrobe_gap,
    outfitPotential: item.outfit_potential,
    pairableCount: item.pairable_count ?? null,
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
