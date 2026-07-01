// Pure (RN-free, runtime import-free) derivation for the First Outfit activation
// gate (redesign brief v0.9 §6). Kept separate so the Node regression runner can
// assert it. Never fabricates an outfit: an insufficient / empty wardrobe maps
// to an honest 'no_outfit' with the specific missing core slots.
import type { ItemCategory } from '@/types/api';

// UI state of the first-outfit gate. `processing` while the recommendation is in
// flight, `failed` on a hard error, otherwise driven by feasible outfit count.
export type FirstOutfitUiState = 'processing' | 'no_outfit' | 'single_outfit' | 'ready' | 'failed';

export type CoreSlot = 'top' | 'bottom' | 'shoes' | 'dress';

export function deriveFirstOutfitState(input: {
  isLoading: boolean;
  isError: boolean;
  todayState?: string | null;
  feasibleOutfitCount: number;
}): FirstOutfitUiState {
  if (input.isError) return 'failed';
  if (input.isLoading) return 'processing';
  if (input.todayState === 'insufficient_items' || input.feasibleOutfitCount <= 0) return 'no_outfit';
  // Exactly one feasible outfit: show it, but do not expose a swap that would
  // always fail (brief §6.3).
  if (input.feasibleOutfitCount === 1) return 'single_outfit';
  return 'ready';
}

/**
 * The core slots still missing before a first outfit is possible. A wearable
 * look needs either separates (top + bottom + shoes) or a dress + shoes. Returns
 * [] when either combo is already satisfied; otherwise the specific gaps to fill
 * (drives SlotGapEmptyState's "再加一条下装" guidance).
 */
export function missingCoreSlots(counts: Partial<Record<ItemCategory, number>>): CoreSlot[] {
  const has = (c: ItemCategory) => (counts[c] ?? 0) > 0;

  const dressCombo = has('dress') && has('shoes');
  const separatesCombo = has('top') && has('bottom') && has('shoes');
  if (dressCombo || separatesCombo) return [];

  // With a dress already in the wardrobe the nearest viable combo is dress +
  // shoes, so the only gap to prompt is shoes — never "add a top" (which
  // wouldn't unlock an outfit). SlotGap's CTA uses missingSlots[0].
  if (has('dress')) return ['shoes'];

  const missing: CoreSlot[] = [];
  if (!has('top')) missing.push('top');
  if (!has('bottom')) missing.push('bottom');
  if (!has('shoes')) missing.push('shoes');
  return missing;
}

/** Count wardrobe items per category (for missingCoreSlots). */
export function countByCategory(
  items: Array<{ category?: ItemCategory | string | null }>,
): Partial<Record<ItemCategory, number>> {
  const counts: Partial<Record<ItemCategory, number>> = {};
  for (const item of items) {
    const cat = item.category as ItemCategory | undefined;
    if (!cat) continue;
    counts[cat] = (counts[cat] ?? 0) + 1;
  }
  return counts;
}
