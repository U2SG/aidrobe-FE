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

/** The three loader callbacks ImageThumb hands to react-native-web's <Image>.
 *
 *  FE#143 — RNW's Image lists onLoadStart/onLoad/onError in its loader effect's
 *  dependency array (node_modules/react-native-web/dist/exports/Image/index.js),
 *  so a fresh closure per render re-arms that effect, and the effect's own
 *  setState schedules the next render: an unbounded reload loop that reaches
 *  React's "Maximum update depth exceeded". Built ONCE PER MOUNT behind a
 *  dependency-free useMemo in ImageThumb, so the identities are stable for the
 *  component's whole life and the effect re-arms only when the uri changes.
 *
 *  Returns a fresh object per call on purpose: the memo owns the stability, not
 *  a module-level cache that would leak one component's setState into another.
 *  The useState setter it closes over is itself stable, so no deps are needed. */
export function imageThumbLoaderHandlers(setState: (next: ImageThumbState) => void) {
  return {
    onLoadStart: () => setState('loading'),
    onLoad: () => setState('loaded'),
    onError: () => setState('failed'),
  };
}
