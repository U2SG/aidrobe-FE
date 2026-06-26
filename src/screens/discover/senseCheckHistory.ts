// Legacy pure (RN-free) render decision for the FE#41 Sense-Check history
// thumbnail regression script. FE#52 rendering now delegates image states to
// ImageThumb; keep this helper so the existing dependency-free assertion still
// documents the old blank-thumbnail failure mode.
export type HistoryThumbState = 'image' | 'fallback';

/**
 * Decide whether a history row shows the item image or the deterministic
 * fallback placeholder. Falls back when there is no URL OR a prior <Image>
 * load errored.
 */
export function historyThumbState(imageUrl: string | null, errored: boolean): HistoryThumbState {
  return imageUrl && !errored ? 'image' : 'fallback';
}
