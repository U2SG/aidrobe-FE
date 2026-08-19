/**
 * V3-021 — the Profile 形象参考 surface as pure data (V3_SPEC §4.4 + §15).
 *
 * RN-free and runtime-import-free (the imports are type-only, so they are
 * erased), exactly like `avatarPhotoSetup.ts` and `avatarProfileMapping.ts`, so
 * the Node regression runner loads it directly and every rule is tested without
 * a simulator. `AvatarReferenceScreen.tsx` holds the rendering and the calls; no
 * rule about what a control does may live in there.
 *
 * WHAT THIS SURFACE IS, AND WHAT IT DELIBERATELY IS NOT.
 *
 * §4.4: "只提供低频数据控制 … 不把 Avatar 包装成需要持续经营的身份主页". So this
 * is a settings sub-page reached from Profile — no tab, no navigation entry, no
 * identity page, and nothing that invites the user to come back and tend it. It
 * renders state and four controls. The frozen scope-exclusion table calls this
 * out by name ("Avatar identity homepage → Profile exposes data controls only"),
 * which is why the state machine below has no notion of progress, history,
 * completeness or streaks.
 *
 * THE ONE PROPERTY THAT NEEDED A STATE MACHINE AT ALL.
 *
 * Acceptance 2: "Delete/revoke changes FE availability **immediately**". A
 * screen that fires the DELETE and then re-reads the profile has a window in
 * which the reference is gone on the server and still on screen — and if the
 * re-read fails (offline, 503 a moment later), the window never closes and the
 * user is looking at a reference they just deleted. So the deletion's own frozen
 * response is what moves this screen: §4.2 pins `status` to `disabled` and the
 * rows are gone in the same transaction that answered, so `deletionSettled`
 * derives the new profile locally instead of asking again. The re-read still
 * happens on the next focus, but nothing depends on it.
 */

import type {
  AvatarDeletion,
  AvatarPreparation,
  AvatarProfile,
  AvatarReferenceControls,
} from '@/api/avatarProfileMapping';
import type { HttpErrorLike } from '@/api/purchaseDecisionMapping';

/** The four §15 controls, plus the re-enable that keeps 停止用于生成 reversible. */
export type AvatarReferenceControl = 'stop' | 'delete' | 'replace' | 'set_up_again';

/** Which controls need an explicit confirmation before anything is called.
 *
 *  Both destructive ones, and only those. `replace` is not destructive — a failed
 *  replacement keeps the live version (§4.2) — and `set_up_again` opens a screen
 *  that asks for consent again, so a confirmation there would be a dialog in
 *  front of a dialog. */
export const AVATAR_REFERENCE_CONFIRMS: readonly AvatarReferenceControl[] = ['stop', 'delete'];

export type AvatarReferenceStep =
  /** The opening profile read is in flight. */
  | 'loading'
  /** State and controls are on screen. */
  | 'shown'
  /** A destructive control is waiting for its confirmation. */
  | 'confirming'
  /** A confirmed control's request is in flight. */
  | 'working'
  | 'problem';

export type AvatarReferenceProblem =
  /** The opening read failed transiently — the whole screen offers a retry. */
  | 'read_failed'
  /** `ENABLE_V3_AVATAR` is off (503), or there is no profile to act on (404).
   *  Retrying cannot help. */
  | 'unavailable'
  /** A control failed and can be tried again. The profile stays on screen. */
  | 'action_failed';

/** What just happened, for the one line of feedback the screen shows.
 *
 *  Not a toast decision and not copy: the screen maps these to keys. Kept in the
 *  state because ">2s operations need a visible outcome" and because a control
 *  that silently succeeded is indistinguishable from one that did nothing. */
export type AvatarReferenceOutcome = 'stopped' | 'deleted' | 'replacing' | null;

export interface AvatarReferenceState {
  step: AvatarReferenceStep;
  problem: AvatarReferenceProblem | null;
  /** Null until the first successful read. */
  profile: AvatarProfile | null;
  /** The control being confirmed, worked on, or offered a retry. */
  pending: AvatarReferenceControl | null;
  outcome: AvatarReferenceOutcome;
}

const BASE: AvatarReferenceState = {
  step: 'loading',
  problem: null,
  profile: null,
  pending: null,
  outcome: null,
};

export function initialAvatarReferenceState(): AvatarReferenceState {
  return { ...BASE };
}

export function profileLoaded(
  state: AvatarReferenceState,
  profile: AvatarProfile,
): AvatarReferenceState {
  return { ...state, step: 'shown', problem: null, pending: null, profile };
}

/**
 * The opening read failed. 503 is separated from everything else because it is
 * the flag-off signal, not a fault: retrying it is a button that cannot succeed.
 */
export function profileReadFailed(
  state: AvatarReferenceState,
  error: HttpErrorLike | null | undefined,
): AvatarReferenceState {
  const status = error?.response?.status ?? null;
  return {
    ...state,
    step: 'problem',
    problem: status === 503 ? 'unavailable' : 'read_failed',
    pending: null,
  };
}

/** A control was tapped. Destructive ones stop to ask; the others go straight to
 *  work, so `controlAsked` is the only entry point a screen needs. */
export function controlAsked(
  state: AvatarReferenceState,
  control: AvatarReferenceControl,
): AvatarReferenceState {
  const confirms = AVATAR_REFERENCE_CONFIRMS.includes(control);
  return {
    ...state,
    step: confirms ? 'confirming' : 'working',
    problem: null,
    outcome: null,
    pending: control,
  };
}

export function controlCancelled(state: AvatarReferenceState): AvatarReferenceState {
  return { ...state, step: 'shown', pending: null, problem: null };
}

export function controlConfirmed(state: AvatarReferenceState): AvatarReferenceState {
  return { ...state, step: 'working', problem: null };
}

/**
 * A deletion answered — and this is where acceptance 2 is either true or not.
 *
 * The new profile is derived from the frozen response rather than re-read: §4.2
 * pins `status` to `disabled`, and `delete_avatar` removes the version and
 * source-asset rows inside the request that answered, so `active_version` and
 * `candidate` are gone as a matter of contract and not of optimism. `consent` is
 * deliberately kept — it is the audit record of what the user agreed to (§4.3),
 * it names no object, and the BE keeps it too.
 *
 * `purgedDerived` decides only which sentence the user reads. Both branches leave
 * the same availability, which is the point: whatever they chose, nothing will be
 * generated from that reference again.
 */
export function deletionSettled(
  state: AvatarReferenceState,
  deletion: AvatarDeletion,
): AvatarReferenceState {
  const previous = state.profile;
  return {
    ...state,
    step: 'shown',
    problem: null,
    pending: null,
    outcome: deletion.purgedDerived ? 'deleted' : 'stopped',
    profile: {
      status: deletion.status,
      // `disabled` is frozen for this response, so whatever the profile said
      // before, what the screen now shows is a status this build does know.
      statusIsKnown: true,
      candidate: null,
      activeVersion: null,
      hasActiveVersion: false,
      consentVersion: previous?.consentVersion ?? null,
      consentedAt: previous?.consentedAt ?? null,
    },
  };
}

/**
 * A replacement was enqueued.
 *
 * The live version stays live and the status stays `ready` (§4.2 — no gap where
 * a ready avatar disappears), so the profile is updated from the response's own
 * status rather than being assumed to have moved. `created=false` still reports
 * `replacing`: it means an identical replacement was already in flight, which is
 * the same true statement to the user, and claiming failure would invite them to
 * pay for it twice.
 */
export function replacementSettled(
  state: AvatarReferenceState,
  preparation: AvatarPreparation,
): AvatarReferenceState {
  const previous = state.profile;
  return {
    ...state,
    step: 'shown',
    problem: null,
    pending: null,
    outcome: 'replacing',
    profile: previous ? { ...previous, status: preparation.status } : previous,
  };
}

/**
 * A control failed. The profile stays on screen — the failure is about the
 * action, not about the state — and only a retryable failure keeps the pending
 * control so the screen can offer that retry against the same control.
 */
export function controlFailed(
  state: AvatarReferenceState,
  error: HttpErrorLike | null | undefined,
): AvatarReferenceState {
  const status = error?.response?.status ?? null;
  // No response at all is connectivity, which is what retry exists for. 503 is
  // the flag going off and 404 is "there is nothing to act on" — both are
  // answered by leaving, not by trying again. Tested before the 5xx branch that
  // would otherwise swallow the 503.
  const retryable = status === null || status === 429 || (status >= 500 && status !== 503);
  return {
    ...state,
    step: 'problem',
    problem: retryable ? 'action_failed' : 'unavailable',
    pending: retryable ? state.pending : null,
    outcome: null,
  };
}

/** Which control a retry would re-run, or null when there is nothing to retry. */
export function referenceRetryTarget(
  state: AvatarReferenceState,
): AvatarReferenceControl | 'read' | null {
  if (state.step !== 'problem') return null;
  if (state.problem === 'read_failed') return 'read';
  if (state.problem === 'action_failed') return state.pending;
  return null;
}

/**
 * Are the controls interactive right now?
 *
 * One rule, so no control can be individually forgotten: while a request is in
 * flight every control is inert, because two destructive calls racing on one
 * profile is a state the user cannot reason about (and the second would answer
 * `4091` or 404 anyway).
 */
export function controlsEnabled(state: AvatarReferenceState): boolean {
  return state.step === 'shown';
}

/**
 * The status line, as a key suffix rather than as copy.
 *
 * §4.4 lists 授权状态 as a Profile row, and the frozen §4.1 enum is the only
 * honest vocabulary for it. Returned as the enum value so the catalogue owns the
 * words and this module owns nothing a translator has to touch.
 */
export function referenceStatusKeySuffix(profile: AvatarProfile | null): string {
  return profile?.status ?? 'none';
}

/** Re-exported so a screen reads both rules from one import and cannot answer
 *  "which controls" from one module and "are they enabled" from another. */
export type { AvatarReferenceControls };
