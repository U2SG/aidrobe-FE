/**
 * A tiny, presentational vocabulary for async operations. This is NOT a state
 * machine library and NOT a server-state store — React Query still owns server
 * state, and screens keep their existing `useMutation` / `saving` booleans. This
 * model only gives the feedback components (OperationBanner / InlineRetry /
 * ProcessingOverlay / SaveBar) a shared phase enum so pending/success/error/retry
 * read consistently across screens.
 *
 * Derive a phase from whatever a screen already has (mutation.isPending,
 * mutation.isError, a local `saving` boolean) via `phaseFromFlags`.
 */
export type OperationPhase =
  | 'idle'
  | 'validating'
  | 'uploading'
  | 'processing'
  | 'saving'
  | 'succeeded'
  | 'failed'
  | 'retrying';

/** Phases where work is in flight (spinner / disabled CTA territory). */
export function isPending(phase: OperationPhase): boolean {
  return (
    phase === 'validating' ||
    phase === 'uploading' ||
    phase === 'processing' ||
    phase === 'saving' ||
    phase === 'retrying'
  );
}

export function isFailed(phase: OperationPhase): boolean {
  return phase === 'failed';
}

export function isSucceeded(phase: OperationPhase): boolean {
  return phase === 'succeeded';
}

/**
 * Map a screen's existing flags onto a phase without introducing new state.
 * `busyPhase` lets the caller say which in-flight phase the work represents
 * (e.g. 'saving' for a save, 'processing' for recognition). `retried` flips a
 * busy phase to 'retrying' so the UI can distinguish a first attempt from a
 * user-driven retry.
 */
export function phaseFromFlags(flags: {
  pending: boolean;
  failed?: boolean;
  succeeded?: boolean;
  retried?: boolean;
  busyPhase?: Extract<OperationPhase, 'validating' | 'uploading' | 'processing' | 'saving'>;
}): OperationPhase {
  const { pending, failed, succeeded, retried, busyPhase = 'saving' } = flags;
  if (pending) return retried ? 'retrying' : busyPhase;
  if (failed) return 'failed';
  if (succeeded) return 'succeeded';
  return 'idle';
}
