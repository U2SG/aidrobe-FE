// FE#73 — RN-free helpers for the packing planner view (BE#68 `plan`). Type-only
// imports so the Node regression runner can load it. The BE plan's free-text
// (summary/weather/reasoning/reason) is English-only on the wire, so the screen
// renders LOCALIZED copy derived from the structured fields; these helpers do the
// structure-only derivation (reuse count, day ordering).

import type { PackingPlanDailyOutfit } from '@/types/api';

/** How many days each item is worn across the plan — the "reuse" / packing-
 *  minimalism signal, derived FE-side (the BE reason text is English-only). */
export function reuseCountByItem(
  dailyOutfits: readonly PackingPlanDailyOutfit[],
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const outfit of dailyOutfits) {
    for (const itemId of outfit.itemIds) {
      counts[itemId] = (counts[itemId] ?? 0) + 1;
    }
  }
  return counts;
}

/** Daily outfits in ascending day order (stable copy, never mutates input). */
export function sortDailyOutfits(
  dailyOutfits: readonly PackingPlanDailyOutfit[],
): PackingPlanDailyOutfit[] {
  return [...dailyOutfits].sort((a, b) => a.day - b.day);
}

/** Unique item ids referenced anywhere in the plan (for batch name resolution). */
export function planItemIds(dailyOutfits: readonly PackingPlanDailyOutfit[]): string[] {
  return [...new Set(dailyOutfits.flatMap((o) => o.itemIds))];
}
