// Pure (RN-free) render decision for the Today main board. Kept in its own
// module so it can be unit-asserted without a React Native renderer, and so the
// screen renders from a single source of truth instead of re-deriving the
// gating inline. See scripts/todayBoard.test.ts.
//
// Three honest states, so an insufficient / empty wardrobe is never dressed up
// as a wearable recommendation:
//   - 'insufficient' — backend state === 'insufficient_items' (forced empty UI,
//     even if an outfit object somehow rode along)
//   - 'real'         — a real API outfit is present for the active variant
//   - 'empty'        — no real outfit (new/empty wardrobe, or this variant is
//     absent) → honest placeholder, no showcase pieces, no actions
export type TodayBoardMode = 'insufficient' | 'real' | 'empty';

/**
 * Decide the board mode from the backend Today state and whether the active
 * variant resolved to a real API outfit. `state` is checked FIRST: an
 * insufficient backend signal forces the empty UI regardless of any outfit.
 * Only 'real' is actionable (Wear this / view detail / share).
 */
export function todayBoardMode(input: { state?: string | null; hasApiOutfit: boolean }): TodayBoardMode {
  if (input.state === 'insufficient_items') return 'insufficient';
  return input.hasApiOutfit ? 'real' : 'empty';
}
