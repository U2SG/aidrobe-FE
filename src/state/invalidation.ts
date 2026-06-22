import type { QueryClient } from '@tanstack/react-query';

/**
 * Centralized mutation → query-invalidation mapping for the mutations called out
 * in FE#17. Query keys in this app are inline string-array literals scattered
 * across screens; this module is the one place the cross-cutting "after mutation
 * X, these caches are stale" rules are documented and encoded. It intentionally
 * covers ONLY the four mutations below — the many other inline
 * `invalidateQueries` call sites are left as-is.
 *
 * Mapping (mutation → invalidated query keys):
 *   confirm import        → wardrobeItems, todayRecommendation
 *   update departure time → userSettings,  todayRecommendation
 *   update location       → userSettings,  todayRecommendation
 *   wear outfit           → todayRecommendation, outfitHistory, wardrobeItems
 */
function invalidateKeys(qc: QueryClient, keys: readonly string[]): void {
  for (const key of keys) {
    void qc.invalidateQueries({ queryKey: [key] });
  }
}

/** confirm import → wardrobeItems, todayRecommendation */
export function invalidateAfterConfirmImport(qc: QueryClient): void {
  invalidateKeys(qc, ['wardrobeItems', 'todayRecommendation']);
}

/** update departure time → userSettings, todayRecommendation */
export function invalidateAfterUpdateDepartureTime(qc: QueryClient): void {
  invalidateKeys(qc, ['userSettings', 'todayRecommendation']);
}

/** update location → userSettings, todayRecommendation */
export function invalidateAfterUpdateLocation(qc: QueryClient): void {
  invalidateKeys(qc, ['userSettings', 'todayRecommendation']);
}

/**
 * wear outfit → todayRecommendation, outfitHistory, wardrobeItems.
 * Not yet wired: no wear-outfit screen is in FE#17 scope. Kept to document the
 * mapping (per the issue) and ready for the wear flow to call.
 */
export function invalidateAfterWearOutfit(qc: QueryClient): void {
  invalidateKeys(qc, ['todayRecommendation', 'outfitHistory', 'wardrobeItems']);
}
