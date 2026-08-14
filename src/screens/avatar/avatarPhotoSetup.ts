// V3-015 — the on-demand full-body photo setup, as pure logic (V3_SPEC §5.5 /
// §7.1 source C / §9.4). Runtime-import-free — every import is type-only and
// therefore erased — so `scripts/avatarPhotoSetup.test.ts` loads it directly in
// Node, the `purchaseDecisionMapping.ts` / `shouldIBuyDecision.ts` pattern. The
// screen renders these states; it decides nothing.
//
// ## The shape of the flow, and why it has this many steps
//
// One screen (§9.4 "单屏完成"), but the backend path behind it has four calls,
// and each one can fail in a way the user must be able to get out of:
//
//     intro ──pick──▶ uploading ──register──▶ detecting ──candidate──▶ review
//       ▲                                                                │
//       └────────────── another photo ◀───────────────────────────── consent
//                                                                        │
//                                                          preparing / ready
//
// `review` is not ceremony. Registration is explicitly NOT consent (contract
// §4.2), and the asset the server offers is *its* newest qualified undecided
// photo — which need not be the one just uploaded if that one failed
// assessment. Taking consent only against a candidate whose own `preview_url`
// is on screen makes "the photo authorized" and "the photo shown" the same
// object by construction, which no ordering guarantee could give us.
//
// ## What deliberately is NOT here
//
// No preview is generated: that is V3-019/V3-020. So this flow ends at "the
// reference is being prepared" and the user returns to a decision that never
// stopped being complete (acceptance 1). `v3_preview_requested` is not emitted
// either — its `concern` is the §6.1 preview enum and this surface has no
// honest source for one; the event ships with the feature that creates a
// preview.

import type {
  AvatarCandidate,
  AvatarPreparationFailure,
  AvatarSetupStart,
  AvatarStatus,
  AvatarSourceType,
  AvatarDetectionDisposition,
} from '@/api/avatarProfileMapping';
import type { DecisionVisualNeed } from '@/api/purchaseDecisionMapping';
import type { AvatarPhotoSource } from '@/utils/personPhotoPicker';

/**
 * How long to wait for the assessment, and why it is not V3-014's window.
 *
 * The passive sheet polls silently after an unrelated flow, so its window is
 * short by design — a sheet arriving late no longer reads as part of what the
 * user just did. Here the user asked for this and is watching a status line, so
 * the wait may be longer: 15s bounded, then an honest recoverable message. Still
 * no countdown and no percentage (§9.5 forbids promising a time we cannot keep).
 */
export const AVATAR_SETUP_POLL_ATTEMPTS = 10;
export const AVATAR_SETUP_POLL_INTERVAL_MS = 1500;

export type AvatarSetupStep =
  /** Purpose, the §15 clauses and the §7.4 minimums — before any picker opens. */
  | 'intro'
  | 'uploading'
  | 'detecting'
  /** A candidate's own photo is on screen and consent is offered against it. */
  | 'review'
  | 'submitting'
  /** Terminal: consent recorded and a preparation is running. */
  | 'preparing'
  /** Terminal: a usable reference already exists. */
  | 'ready'
  | 'problem';

export type AvatarSetupProblem =
  /** Album or camera permission refused — recoverable after granting it. */
  | 'permission_denied'
  | 'upload_failed'
  /** Assessment produced no candidate inside the window, or nothing was queued.
   *  Stated as "not this photo", never as "you cannot do this". */
  | 'photo_unusable'
  | 'consent_failed'
  /** Consent IS recorded; only the enqueue failed. Retry resumes at prepare. */
  | 'preparation_failed'
  /** 503 with the flag off, 404, or a conflict a profile read could not settle. */
  | 'unavailable'
  /** The reference was switched off, and P0 has no reachable path to re-enable
   *  it (see `avatarSetupStart`). Said plainly rather than dressed as a retry. */
  | 'revoked';

export interface AvatarSetupState {
  step: AvatarSetupStep;
  problem: AvatarSetupProblem | null;
  /** The candidate consent is (or was) taken against. */
  candidate: AvatarCandidate | null;
  /** Local URI of the photo being uploaded — shown while it is in flight so the
   *  status line refers to something visible. Never shown on `review`: see the
   *  header note on why only the server's own preview may stand in for the
   *  asset being authorized. */
  pickedUri: string | null;
  source: AvatarPhotoSource | null;
  pollAttempt: number;
  /** Once true, the answer is on file and cannot be given again — a decided
   *  asset answers `4091` (`record_consent` refuses to re-decide). Any retry
   *  after this point must resume at `prepare`. */
  consentRecorded: boolean;
}

const BASE: AvatarSetupState = {
  step: 'intro',
  problem: null,
  candidate: null,
  pickedUri: null,
  source: null,
  pollAttempt: 0,
  consentRecorded: false,
};

/**
 * Where the screen opens, from the profile it just read.
 *
 * `already_preparing` / `already_ready` are terminal rather than errors: the
 * user asked for a reference and one is either coming or here. `blocked` is the
 * revoked case — honest, and specifically not "we could not use this photo".
 */
export function initialAvatarSetupState(
  start: AvatarSetupStart,
  candidate: AvatarCandidate | null,
): AvatarSetupState {
  switch (start) {
    case 'new_photo':
      return { ...BASE };
    case 'consent_existing_candidate':
      return { ...BASE, step: 'review', candidate };
    case 'already_preparing':
      return { ...BASE, step: 'preparing' };
    case 'already_ready':
      return { ...BASE, step: 'ready' };
    case 'blocked':
      return { ...BASE, step: 'problem', problem: 'revoked' };
  }
}

/** The profile read the screen opens with failed. Everything about this surface
 *  is optional, so it says so and offers the way back (contract §2 rule 2). */
export function setupUnavailable(state: AvatarSetupState): AvatarSetupState {
  return { ...state, step: 'problem', problem: 'unavailable' };
}

/**
 * Should the decision card offer the setup entry at all?
 *
 * Two gates, both frozen elsewhere:
 *
 * - **`visual_need`.** V3-007 sets it to `none` exactly when text and wardrobe
 *   evidence already answer the question, and contract §3 makes an unknown value
 *   degrade to `none` because "no preview entry is shown". Asking a user for a
 *   full-body photo to answer a question already answered is the gratuitous
 *   prompting §3.4/§7.3 forbid.
 * - **the profile.** Only the two states this surface can actually serve.
 *   `already_ready` shows nothing *yet*: generating the preview is V3-019/V3-020,
 *   and until it exists an entry there would open a screen that says "you are
 *   already set up" — true, useless, and the dead end §3.6 forbids.
 */
export function previewSetupEntryVisible(args: {
  visualNeed: DecisionVisualNeed;
  start: AvatarSetupStart;
}): boolean {
  if (args.visualNeed === 'none') return false;
  return args.start === 'new_photo' || args.start === 'consent_existing_candidate';
}

/**
 * The `source_type` for `v3_avatar_prompt_shown`, or null when no prompt is
 * shown at all.
 *
 * Emitted once per visit, when the ask first reaches the screen — the intro IS
 * the ask, so waiting for a photo would push every user who read it and left
 * into the "never asked" cohort and bias `consent_prompt_completion_delta`
 * (kill criterion 4) in the direction that hides the harm.
 *
 * `user_upload` for a new photo, for both album and camera, because that is what
 * the server records: `register_avatar_upload` passes
 * `AvatarSourceType.USER_UPLOAD` for every photo this surface registers. Sending
 * `camera_capture` would name a value no asset carries and break the join with
 * the BE-emitted `v3_avatar_consent`. The value stays in the frozen enum for a
 * surface that produces it.
 */
export const SOURCE_C_SOURCE_TYPE: AvatarSourceType = 'user_upload';

export function promptSourceType(
  start: AvatarSetupStart,
  candidate: AvatarCandidate | null,
): AvatarSourceType | null {
  if (start === 'new_photo') return SOURCE_C_SOURCE_TYPE;
  if (start === 'consent_existing_candidate') return candidate?.sourceType ?? null;
  return null;
}

// --- The picker's three answers ------------------------------------------------

/** Cancelling is not a failure: the screen returns to exactly the state it was
 *  in, with nothing sent and nothing said (§3.6 — a cancelled action must not
 *  leave wreckage). Any prior problem is cleared, so a denial the user then
 *  fixed does not keep its message. */
export function photoPickCancelled(state: AvatarSetupState): AvatarSetupState {
  return { ...state, step: 'intro', problem: null, source: null };
}

export function photoPickDenied(
  state: AvatarSetupState,
  source: AvatarPhotoSource,
): AvatarSetupState {
  return { ...state, step: 'problem', problem: 'permission_denied', source };
}

export function photoPicked(
  state: AvatarSetupState,
  source: AvatarPhotoSource,
  uri: string,
): AvatarSetupState {
  return { ...state, step: 'uploading', problem: null, source, pickedUri: uri };
}

export function uploadFailed(state: AvatarSetupState): AvatarSetupState {
  return { ...state, step: 'problem', problem: 'upload_failed' };
}

/** The registration answered. `not_watching` is reported as "not this photo"
 *  immediately rather than after a 15s wait for something that was never
 *  queued. */
export function photoRegistered(
  state: AvatarSetupState,
  disposition: AvatarDetectionDisposition,
): AvatarSetupState {
  if (disposition === 'unavailable') return { ...state, step: 'problem', problem: 'unavailable' };
  if (disposition === 'not_watching') {
    return { ...state, step: 'problem', problem: 'photo_unusable' };
  }
  return { ...state, step: 'detecting', problem: null, pollAttempt: 0 };
}

/**
 * The registration call itself failed (not the photo — the request).
 *
 * A transient failure is reported as `upload_failed`, because that is what the
 * user must redo: the object is uploaded but nothing was queued for it, and the
 * cheapest honest recovery is to send the same photo again. A permanent one
 * (503 with the flag off, or a key the server will not accept) is `unavailable`,
 * where a retry would be a button guaranteed to fail.
 */
export function registrationFailed(
  state: AvatarSetupState,
  retryable: boolean,
): AvatarSetupState {
  return { ...state, step: 'problem', problem: retryable ? 'upload_failed' : 'unavailable' };
}

/** Delay before poll `attempt` (0-based), or null when the window is spent. */
export function nextSetupPollDelayMs(attempt: number): number | null {
  return attempt < AVATAR_SETUP_POLL_ATTEMPTS ? AVATAR_SETUP_POLL_INTERVAL_MS : null;
}

/**
 * One assessment poll came back. `candidate` is whatever the profile is offering
 * now — null when it is offering nothing yet.
 *
 * Exhausting the window is `photo_unusable`, not a timeout message, and the
 * distinction is honest in both directions: we cannot tell a rejected photo from
 * a slow one, and both are resolved by the same action (try another photo).
 * Saying "timed out" would invite the user to wait for something that may never
 * come.
 */
export function detectionPolled(
  state: AvatarSetupState,
  candidate: AvatarCandidate | null,
): AvatarSetupState {
  if (candidate) return { ...state, step: 'review', problem: null, candidate };
  const attempt = state.pollAttempt + 1;
  if (nextSetupPollDelayMs(attempt) === null) {
    return { ...state, step: 'problem', problem: 'photo_unusable' };
  }
  return { ...state, pollAttempt: attempt };
}

// --- The answer ----------------------------------------------------------------

export function consentSubmitted(state: AvatarSetupState): AvatarSetupState {
  return { ...state, step: 'submitting', problem: null };
}

export function consentRecorded(state: AvatarSetupState): AvatarSetupState {
  return { ...state, consentRecorded: true };
}

export function consentFailed(state: AvatarSetupState, retryable: boolean): AvatarSetupState {
  return {
    ...state,
    step: 'problem',
    problem: retryable ? 'consent_failed' : 'unavailable',
  };
}

/** The preparation enqueue answered, or a 409 was settled by re-reading the
 *  profile. Anything other than a preparing/ready status leaves the retry
 *  standing, because the user has not got what they asked for. */
export function preparationSettled(
  state: AvatarSetupState,
  status: AvatarStatus | 'unresolved',
): AvatarSetupState {
  if (status === 'preparing' || status === 'candidate') {
    // `candidate` while a job is enqueued is the retry-after-failure shape
    // (`AvatarLifecycle.begin_preparation` moves it) — work is running either
    // way, which is what the user is told.
    return { ...state, step: 'preparing', problem: null };
  }
  if (status === 'ready' || status === 'refresh_recommended') {
    return { ...state, step: 'ready', problem: null };
  }
  return { ...state, step: 'problem', problem: 'preparation_failed' };
}

export function preparationFailed(
  state: AvatarSetupState,
  failure: Exclude<AvatarPreparationFailure, 'conflict'>,
): AvatarSetupState {
  return {
    ...state,
    step: 'problem',
    problem: failure === 'retryable' ? 'preparation_failed' : 'unavailable',
  };
}

/**
 * Back to the intro to choose a different photo.
 *
 * Nothing is sent. The candidate on file is left exactly as it was —
 * `accept=false` would dismiss that photo *permanently* (§4.2), which is a
 * heavier answer than "not this one" and would destroy material the user may
 * still want. Walking away from the screen has the same shape: this device says
 * nothing about that asset, and the server keeps it consentable.
 */
export function chooseAnotherPhoto(): AvatarSetupState {
  return { ...BASE };
}

// --- Recovery ------------------------------------------------------------------

/**
 * What the retry action must actually do — never "start over".
 *
 * `consent` → `prepare` is the case that matters: once consent is recorded the
 * asset cannot be re-decided (`4091`), so a retry that replayed the whole answer
 * would fail forever on a request the user already completed. `null` means the
 * state offers no retry and only a way back.
 */
export type AvatarSetupRetry = 'pick' | 'upload' | 'consent' | 'prepare' | null;

export function retryTarget(state: AvatarSetupState): AvatarSetupRetry {
  switch (state.problem) {
    case 'permission_denied':
    case 'photo_unusable':
      return 'pick';
    case 'upload_failed':
      // The picked file is still on disk, so the cheap retry is the upload
      // itself; only a lost URI sends the user back to the picker.
      return state.pickedUri ? 'upload' : 'pick';
    case 'consent_failed':
      return state.consentRecorded ? 'prepare' : 'consent';
    case 'preparation_failed':
      return 'prepare';
    default:
      return null;
  }
}

/** Is the setup over — nothing left to ask, nothing left to wait for on this
 *  screen? Both terminal steps offer one action: back to the decision. */
export function setupIsTerminal(state: AvatarSetupState): boolean {
  return state.step === 'preparing' || state.step === 'ready';
}
