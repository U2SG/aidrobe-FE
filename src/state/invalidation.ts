import type { QueryClient } from '@tanstack/react-query';

/**
 * Centralized mutation → query-invalidation mapping for the mutations called out
 * in FE#17. Query keys in this app are inline string-array literals scattered
 * across screens; this module is the one place the cross-cutting "after mutation
 * X, these caches are stale" rules are documented and encoded.
 *
 * Mapping (mutation → invalidated query keys):
 *   confirm import        → wardrobeItems, insights, todayRecommendation
 *   wardrobe item change  → wardrobeItems, insights, todayRecommendation
 *   update departure time → userSettings,  todayRecommendation
 *   update location       → userSettings,  todayRecommendation
 *   wear outfit           → todayRecommendation, outfitHistory, wardrobeItems, insights
 *
 * `insights` is a prefix key — invalidating it matches every ['insights', *]
 * query (summary / topItems / palette / styleTrend / wardrobeHealth), so the
 * 衣橱洞察 counts can't go stale after the item set changes (the bug where a
 * delete dropped the wardrobe list to 11 but left 总件数 at the pre-delete 15).
 */
function invalidateKeys(qc: QueryClient, keys: readonly string[]): void {
  for (const key of keys) {
    void qc.invalidateQueries({ queryKey: [key] });
  }
}

/** confirm import → wardrobeItems, insights, todayRecommendation */
export function invalidateAfterConfirmImport(qc: QueryClient): void {
  invalidateKeys(qc, ['wardrobeItems', 'insights', 'todayRecommendation']);
}

/**
 * wardrobe item changed (delete / edit metadata / status) → wardrobeItems,
 * insights, todayRecommendation. The item set / its attributes changed, so the
 * list, every insights aggregate, and today's recommendation are all stale.
 */
export function invalidateAfterWardrobeItemChange(qc: QueryClient): void {
  invalidateKeys(qc, ['wardrobeItems', 'insights', 'todayRecommendation']);
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
 * wear outfit → todayRecommendation, outfitHistory, wardrobeItems, insights.
 * Not yet wired: no wear-outfit screen is in FE#17 scope. Kept to document the
 * mapping (per the issue) and ready for the wear flow to call. Wearing changes
 * wear counts, so insights (most-worn / active-rate) is stale too.
 */
export function invalidateAfterWearOutfit(qc: QueryClient): void {
  invalidateKeys(qc, ['todayRecommendation', 'outfitHistory', 'wardrobeItems', 'insights']);
}

/**
 * change language (FE#19) → userSettings, todayRecommendation.
 * UI strings + enum labels re-render from the local locale store immediately,
 * and item display-names resolve client-side from cached localized_names — so
 * wardrobeItems does NOT need invalidating. todayRecommendation is refreshed so
 * any server-localized recommendation text follows the new locale.
 */
export function invalidateAfterChangeLanguage(qc: QueryClient): void {
  invalidateKeys(qc, ['userSettings', 'todayRecommendation']);
}
