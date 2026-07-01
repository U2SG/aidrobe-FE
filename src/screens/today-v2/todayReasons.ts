// Pure (RN-free, runtime import-free) builder that turns an outfit into the
// structured RecommendationReason[] the Today v2 reason list renders. Kept
// separate so it can be unit-asserted by the Node regression runner. See
// scripts/todayReasons.test.ts.
//
// The BE returns reasons as plain text today (no `source`), so reasons are built
// from real fields only — the primary `reason` plus any prep notes — never
// fabricated. `source` stays undefined until the BE contract adds it, at which
// point the list simply starts rendering the provenance label.
import type { OutfitSummary, RecommendationReason } from '@/types/api';

export function buildRecommendationReasons(
  outfit: Pick<OutfitSummary, 'reason' | 'prepNotes'>,
  maxReasons = 3,
): RecommendationReason[] {
  const reasons: RecommendationReason[] = [];

  const primary = outfit.reason?.trim();
  if (primary) reasons.push({ text: primary });

  for (const note of outfit.prepNotes ?? []) {
    const text = note.fallbackText?.trim();
    if (text) reasons.push({ text });
  }

  return reasons.slice(0, Math.max(0, maxReasons));
}
