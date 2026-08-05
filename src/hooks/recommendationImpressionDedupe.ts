// Pure (RN/React-free) dedupe-key logic for recommendation impression events
// (FE#130). Kept dependency-free so it can be unit-asserted without a React
// renderer — see scripts/recommendationImpressionDedupe.test.ts.
//
// Dedupe is per (recommendation_id, revision, outfit_id, source_surface): the
// same recommendation revision must emit exactly one impression regardless of
// how many times the surface re-renders during a session (focus refetch,
// cache replacement, tab re-entry, ...). A component-local ref would reset on
// remount, so the store lives at module scope — "per-session" means "for the
// lifetime of this JS runtime," not "for the lifetime of one mount."

export interface ImpressionIdentity {
  recommendationId?: string | null;
  revision?: number | null;
  outfitId?: string | null;
  sourceSurface: string;
}

/**
 * Null whenever any identity part is missing — legacy/flag-off payloads (no
 * recommendation_id/revision) or no real outfit card never produce a dedupe
 * key, so callers can treat null as "skip emission entirely."
 */
export function buildImpressionKey(identity: ImpressionIdentity): string | null {
  const { recommendationId, revision, outfitId, sourceSurface } = identity;
  if (!recommendationId || revision == null || !outfitId) return null;
  return `${recommendationId}:${revision}:${outfitId}:${sourceSurface}`;
}

export interface ImpressionDedupeStore {
  /** True (and marks the key seen) the first time a key is checked; false on
   * every later check for the same key. */
  shouldEmit(key: string): boolean;
  reset(): void;
}

export function createImpressionDedupeStore(): ImpressionDedupeStore {
  const seen = new Set<string>();
  return {
    shouldEmit(key: string): boolean {
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    },
    reset(): void {
      seen.clear();
    },
  };
}

// Shared module-level singleton the hook reads from — survives component
// unmount/remount for the life of the app session.
export const impressionDedupeStore: ImpressionDedupeStore = createImpressionDedupeStore();
