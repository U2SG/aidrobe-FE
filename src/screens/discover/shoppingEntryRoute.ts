// Which screen a "should I buy this" tool entry opens.
//
// V3-009 replaced the Discover tool entrance with `ShouldIBuy` behind
// `enableV3PurchaseDecision`, but the V2 shell (`MainTabsV2`) has no Discover
// tab at all — it mounts Today / Wardrobe / Ask / Profile — so with
// `ENABLE_MVP_V2_UI` on, the gated screen was unreachable and the Ask and
// Profile entries kept opening the V2 `SenseCheck` (codex review, FE#141).
//
// Both shells now ask this one function, so "which entry point did we forget"
// stops being a per-screen question. RN-free and dependency-free on purpose:
// `scripts/shoppingEntryRoute.test.ts` runs it directly.

export type ShoppingEntryRoute = 'ShouldIBuy' | 'SenseCheck';

/**
 * `ShouldIBuy` while the FE flag is on, `SenseCheck` otherwise.
 *
 * The FE flag alone decides the *destination*; the BE gate
 * (`ENABLE_V3_PURCHASE_DECISION`) independently answers 503 and the decision
 * card self-hides on it, which is why routing does not need to know the server
 * state to stay honest.
 */
export function shoppingEntryRoute(v3PurchaseDecisionEnabled: boolean): ShoppingEntryRoute {
  return v3PurchaseDecisionEnabled ? 'ShouldIBuy' : 'SenseCheck';
}
