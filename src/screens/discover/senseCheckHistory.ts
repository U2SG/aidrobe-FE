// Pure (RN-free) render decision for a Sense-Check history thumbnail. Kept in
// its own module so it can be unit-asserted without a React Native renderer.
export type HistoryThumbState = 'image' | 'fallback';

/**
 * Decide whether a history row shows the item image or the deterministic
 * fallback placeholder. Falls back when there is no URL OR a prior <Image>
 * load errored. This is the single source of truth the screen renders from.
 */
export function historyThumbState(imageUrl: string | null, errored: boolean): HistoryThumbState {
  return imageUrl && !errored ? 'image' : 'fallback';
}
