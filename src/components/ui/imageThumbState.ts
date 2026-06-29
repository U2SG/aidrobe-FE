// RN-free pure state logic for ImageThumb (FE#52 / FE#75). Deliberately import-
// free so the Node regression runner can load it (react-native loads at module
// scope in the .tsx and would crash a plain `node` test). ImageThumb.tsx and the
// regression test both consume these.

export type ImageThumbState = 'loading' | 'empty' | 'failed' | 'loaded';

/** Initial state from whether the thumb has any image to load.
 *  No image (missing media) ⇒ 'empty'; otherwise start in 'loading'. */
export function initialImageThumbState(hasImage: boolean): ImageThumbState {
  return hasImage ? 'loading' : 'empty';
}

/** Whether the placeholder card (vs the real image) renders for a state.
 *  Missing media ('empty') and a failed load ('failed') both fall back to it. */
export function imageThumbShowsPlaceholder(state: ImageThumbState): boolean {
  return state === 'empty' || state === 'failed';
}
