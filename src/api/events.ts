import { apiPost } from './client';

// BE#81 — general passive-learning event ingestion. Append-only on the server;
// weak signals never overwrite explicit preferences, so emitting generously is
// safe.
//
// Signal-ownership map (FE#130) — keep these two ingestion paths from
// drifting apart:
//   - context_override_submitted is emitted SERVER-side by the refresh
//     endpoint (BE#78) — do not double-send it from here.
//   - outfit_disliked / love are owned by explicit feedback
//     (`sendOutfitFeedback` -> POST /outfits/{id}/feedback, see
//     RecommendationFeedback.tsx) — never emit a duplicate passive event for
//     an explicit dislike/love; explicit feedback is the single source of
//     truth for that signal.
export type RecommendationEventType =
  | 'outfit_impression'
  | 'outfit_swapped'
  | 'outfit_disliked'
  | 'passive_wear_prompt_answered'
  | 'resurface_insight_viewed'
  | 'resurface_item_opened'
  | 'temperature_mismatch_reported';

export interface RecommendationEventBody {
  eventType: RecommendationEventType;
  signalStrength: 'weak' | 'medium' | 'strong';
  sourceSurface: 'today' | 'ask' | 'wardrobe' | 'profile';
  outfitId?: string;
  recommendationId?: string;
  itemId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Fire-and-forget: learning signals must never interrupt the user — no error
 * toast (silentErrorToast) and a swallowed failure (an event lost to a network
 * blip is acceptable; a red toast for it is not).
 */
export function emitRecommendationEvent(body: RecommendationEventBody): void {
  void apiPost(
    '/v1/recommendations/events',
    {
      event_type: body.eventType,
      signal_strength: body.signalStrength,
      source_surface: body.sourceSurface,
      outfit_id: body.outfitId ?? null,
      recommendation_id: body.recommendationId ?? null,
      item_id: body.itemId ?? null,
      metadata: body.metadata ?? null,
    },
    undefined,
    { silentErrorToast: true },
  ).catch(() => {
    // Swallowed by design — see docstring.
  });
}
