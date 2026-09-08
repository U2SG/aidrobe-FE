import { useEffect } from 'react';

import { emitRecommendationEvent, type RecommendationEventBody } from '@/api/events';
import { buildImpressionKey, impressionDedupeStore } from '@/hooks/recommendationImpressionDedupe';

interface UseRecommendationImpressionArgs {
  recommendationId?: string | null;
  revision?: number | null;
  outfitId?: string | null;
  sourceSurface: RecommendationEventBody['sourceSurface'];
  /** Extra fields merged into the emitted event's metadata (e.g. mode, generationSource). */
  metadata?: Record<string, unknown>;
}

/**
 * FE#130 — emits one weak `outfit_impression` event the first time a real
 * outfit card becomes visible, keyed on recommendation_id + revision +
 * outfit_id + source_surface. Reusable by Today (today/tomorrow mode), First
 * Outfit, and future surfaces (Adaptive Week) — the dedupe-key logic lives in
 * the pure sibling module (`recommendationImpressionDedupe.ts`) so focus
 * refetch / cache replacement never re-fires for the same revision.
 *
 * No-ops whenever recommendationId/revision/outfitId is missing — legacy /
 * flag-off payloads carry no identity to attribute the event to.
 *
 * Fire-and-forget: emitRecommendationEvent already swallows failures, so this
 * never blocks rendering.
 */
export function useRecommendationImpression({
  recommendationId,
  revision,
  outfitId,
  sourceSurface,
  metadata,
}: UseRecommendationImpressionArgs): void {
  const key = buildImpressionKey({ recommendationId, revision, outfitId, sourceSurface });

  useEffect(() => {
    if (!key) return;
    if (!impressionDedupeStore.shouldEmit(key)) return;
    emitRecommendationEvent({
      eventType: 'outfit_impression',
      signalStrength: 'weak',
      sourceSurface,
      outfitId: outfitId ?? undefined,
      recommendationId: recommendationId ?? undefined,
      metadata: { ...metadata, revision },
    });
    // `key` already encodes every identity input (recommendationId, revision,
    // outfitId, sourceSurface) — re-running only when it changes is the point.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}
