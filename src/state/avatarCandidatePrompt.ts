// V3-014 — pure (RN-free, import-free) one-time gating for the avatar candidate
// sheet. The persisted store (src/store/avatarCandidatePrompt.ts) just holds the
// state and calls these. Tested by scripts/avatarCandidatePrompt.test.ts.
//
// WHY THIS IS NOT `promptFrequency.ts`. That module caps *recurring* passive
// prompts: rolling windows, N-per-week, ignore-streak suppression, an unmute
// date. V3_SPEC §7.3 asks for the opposite semantics — "每张候选只提示一次",
// once per candidate, forever, with no window that can ever re-open it. Folding
// this into a rolling-window store would mean a cap of 1 whose window is
// infinite, i.e. every field in that state shape unused or lying, and the first
// person to tune a cap would silently re-arm a consent prompt the user already
// declined. Two stores, two meanings.

/** Bounded discovery window after a source flow. Detection is an async worker
 *  job (BE `enqueue_candidate_detection` → `avatar_candidate_worker`), so the
 *  candidate does not exist yet when the flow returns; these are the polls that
 *  wait for it. Silent by construction — no spinner, no "checking your
 *  photo…", which §7.3 would read as a countdown. */
export const AVATAR_CANDIDATE_POLL_ATTEMPTS = 6;
export const AVATAR_CANDIDATE_POLL_INTERVAL_MS = 2000;

/** Ledger cap. Ids are only ever compared for membership, so the oldest are
 *  dropped first. Sized far above any realistic per-device candidate count so
 *  eviction cannot re-arm a real user's declined prompt; the cap exists to
 *  bound storage, not to expire an answer. */
export const AVATAR_PROMPT_LEDGER_MAX = 200;

export type AvatarCandidatePromptState = {
  /** Source-asset ids this device has already put in front of the user. */
  promptedAssetIds: string[];
};

export function initialAvatarCandidatePromptState(): AvatarCandidatePromptState {
  return { promptedAssetIds: [] };
}

export function hasBeenPrompted(s: AvatarCandidatePromptState, sourceAssetId: string): boolean {
  return s.promptedAssetIds.includes(sourceAssetId);
}

/**
 * Record at SHOW time, not at answer time.
 *
 * The record is what makes the prompt one-time, and the answer may never
 * arrive: the user can background the app, kill it, decline while offline, or
 * meet a failed POST. Recording on a successful consent call instead would
 * re-ask on the next source flow in exactly those cases — the "repeated
 * prompting" acceptance 4 forbids, arriving through the failure path.
 *
 * A device that has shown a prompt and lost the answer therefore stays silent
 * about that candidate. That is the deliberate direction: the server keeps the
 * candidate consentable (it is still `status=candidate`), and V3-015's
 * on-demand path is where a user who wants an avatar asks for one.
 */
export function recordPrompted(
  s: AvatarCandidatePromptState,
  sourceAssetId: string,
): AvatarCandidatePromptState {
  if (hasBeenPrompted(s, sourceAssetId)) return s;
  const promptedAssetIds = [...s.promptedAssetIds, sourceAssetId];
  return {
    ...s,
    promptedAssetIds: promptedAssetIds.slice(-AVATAR_PROMPT_LEDGER_MAX),
  };
}

/** Delay before poll `attempt` (0-based), or `null` when the window is spent.
 *  Fixed interval rather than backoff: the window is short and bounded, and a
 *  backoff would push the last poll far enough from the flow that a sheet
 *  arriving then would no longer read as part of it. */
export function nextPollDelayMs(attempt: number): number | null {
  return attempt < AVATAR_CANDIDATE_POLL_ATTEMPTS ? AVATAR_CANDIDATE_POLL_INTERVAL_MS : null;
}

/** Total time the discovery window can stay open — the property that keeps the
 *  sheet tied to the flow that armed it. */
export function promptWindowMs(): number {
  return AVATAR_CANDIDATE_POLL_ATTEMPTS * AVATAR_CANDIDATE_POLL_INTERVAL_MS;
}
