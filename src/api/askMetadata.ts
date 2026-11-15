import type { AskItemRefSnapshot, AskTripIntent, ServerAskItemRefSnapshot, ServerAskTripIntent } from '../types/api';

// Ask, history and conversation reads carry the same freshly signed item snapshots.
export function toAskMetadata(data: {
  item_refs?: string[];
  item_ref_snapshots?: ServerAskItemRefSnapshot[];
  trip_intent?: ServerAskTripIntent | null;
}): { itemRefs: string[]; itemRefSnapshots: AskItemRefSnapshot[]; tripIntent: AskTripIntent | null } {
  return {
    itemRefs: data.item_refs ?? [],
    itemRefSnapshots: (data.item_ref_snapshots ?? []).map((snapshot) => ({
      itemId: snapshot.item_id,
      name: snapshot.name,
      category: snapshot.category,
      colorMain: snapshot.color_main,
      thumbnailUrl: snapshot.thumbnail_url ?? null,
    })),
    tripIntent: data.trip_intent?.is_trip
      ? { isTrip: true, durationDays: data.trip_intent.duration_days ?? null }
      : null,
  };
}
