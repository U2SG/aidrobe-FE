// FE#74 — RN-free presentation helpers for the Should-I-Buy purchase-evaluation
// cards (BE#69 `evaluation`). Type-only imports so the Node regression runner can
// load it (mirrors wardrobeHealth.ts).

import type { PurchaseEvaluation, ServerPurchaseEvaluation, WardrobeGapDetail } from '@/types/api';

export type SeverityTone = 'neutral' | 'warning' | 'danger';

// BE#69 — map the optional purchase-evaluation block (snake → camel). Null/absent
// when the server's ENABLE_PURCHASE_EVALUATOR is off, so the FE shows no cards.
export function toEvaluation(
  e: ServerPurchaseEvaluation | null | undefined,
): PurchaseEvaluation | null {
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

// The redundancy reason is derived FE-side from similarity (mirrors the BE rule:
// >= 0.9 ⇒ same category AND color) so we render a LOCALIZED label rather than the
// BE's zh-only free-text `reason` (which would leak Chinese in en-US).
export type RedundancyReasonKind = 'same_color_category' | 'same_category';
export function redundancyReasonKind(similarity: number): RedundancyReasonKind {
  return similarity >= 0.9 ? 'same_color_category' : 'same_category';
}

/** Order severities so the most pressing gap/redundancy leads the card list. */
export function severityRank(severity: string | null | undefined): number {
  switch (severity) {
    case 'high':
      return 3;
    case 'medium':
      return 2;
    case 'low':
      return 1;
    default:
      return 0;
  }
}

/** Map a severity (or redundancy level) to a Badge tone. Deliberately tops out at
 *  'danger' (not an alarm color) — the copy stays helpful, not shaming. */
export function severityTone(severity: string | null | undefined): SeverityTone {
  switch (severity) {
    case 'high':
      return 'danger';
    case 'medium':
      return 'warning';
    default:
      return 'neutral';
  }
}

/** Most-severe gaps first; stable for equal severities. */
export function sortGapsBySeverity(gaps: readonly WardrobeGapDetail[]): WardrobeGapDetail[] {
  return [...gaps].sort((a, b) => severityRank(b.severity) - severityRank(a.severity));
}
