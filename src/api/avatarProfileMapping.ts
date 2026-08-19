/**
 * V3-014 — the frozen §4 avatar contract as pure data.
 * V3-015 extends it with the two source-C surfaces (`uploads`, `prepare`) and
 * the one rule that decides how an on-demand setup may start.
 *
 * RN-free and runtime-import-free (the one import is type-only, so it is
 * erased) exactly like `purchaseDecisionMapping.ts`, so the Node regression
 * runner loads it directly and every shape/vocabulary/skew rule is tested
 * without a simulator. `avatarProfile.ts` holds only the HTTP calls, so no
 * contract logic can hide in there either.
 *
 * Nothing here is persisted: `preview_url` is a short-lived signed URL
 * (contract §3, V3_SPEC §13.5). The durable reference is `sourceAssetId`.
 */

import type { HttpErrorLike } from './purchaseDecisionMapping';

/** §4.1 frozen state machine. */
export const AVATAR_STATUSES = [
  'none',
  'candidate',
  'preparing',
  'ready',
  'refresh_recommended',
  'disabled',
] as const;
export type AvatarStatus = (typeof AVATAR_STATUSES)[number];

/** §4.2 `candidate.source_type`. Identical to the analytics contract's
 *  `V3_AVATAR_SOURCES`; asserted equal in the regression test rather than
 *  imported, so the API vocabulary and the event vocabulary stay provably in
 *  step without one silently redefining the other. */
export const AVATAR_SOURCE_TYPES = [
  'ootd_photo',
  'outfit_import',
  'user_upload',
  'camera_capture',
] as const;
export type AvatarSourceType = (typeof AVATAR_SOURCE_TYPES)[number];

// --- Wire shapes (frozen §4.2) ----------------------------------------------

export interface ServerAvatarCandidate {
  source_asset_id: string;
  source_type: string;
  preview_url?: string | null;
}

export interface ServerAvatarActiveVersion {
  id: string;
  created_at: string;
  canonical_front_url?: string | null;
}

export interface ServerAvatarConsent {
  version: string;
  consented_at: string;
}

export interface ServerAvatarProfile {
  status: string;
  active_version?: ServerAvatarActiveVersion | null;
  candidate?: ServerAvatarCandidate | null;
  consent?: ServerAvatarConsent | null;
}

// --- Client shapes -----------------------------------------------------------

export interface AvatarCandidate {
  /** Durable storage reference — the only candidate field safe to persist. */
  sourceAssetId: string;
  /** `null` when the server named a source this build does not know. */
  sourceType: AvatarSourceType | null;
  /** Short-lived signed URL. Render it, never store it. */
  previewUrl: string | null;
}

/**
 * The live reference — V3-021, for §15's 查看当前形象参考 and §4.4's 当前版本.
 *
 * V3-014 kept only `hasActiveVersion` because a boolean was all a prompt gate
 * needed, and carrying a person's likeness through a shape nothing rendered
 * would have been strictly worse. Profile has to show it, so the fields arrive
 * with the surface that displays them and not before.
 */
export interface AvatarActiveVersion {
  id: string;
  /** ISO timestamp, or null if the server sent one this build cannot read. */
  createdAt: string | null;
  /** Short-lived signed URL (contract §3, V3_SPEC §13.5). Render it inside the
   *  pass that read it; never put it in storage, a log or a cache key. */
  canonicalFrontUrl: string | null;
}

export interface AvatarProfile {
  status: AvatarStatus;
  /**
   * Did the server name a status this build knows?
   *
   * V3-021 needs this and earlier features did not, because the two things
   * `status === 'disabled'` can mean stopped being equivalent. The frozen §3 skew
   * rule collapses an unrecognized status to `disabled` so that avatar surfaces
   * HIDE — and while `disabled` was a dead end that was the whole story. Now
   * `disabled` is the state Profile offers to re-enable, so a collapsed unknown
   * would inherit an invitation to upload a person photo on the strength of a
   * string this build cannot interpret: exactly what the skew rule exists to
   * prevent, arrived at from the other direction.
   *
   * So the collapse still happens (nothing downstream has to know the vocabulary
   * grew) and the fact that it happened is no longer lost.
   */
  statusIsKnown: boolean;
  candidate: AvatarCandidate | null;
  consentVersion: string | null;
  consentedAt: string | null;
  /** Populated only for ready/refresh_recommended (frozen §4.2). */
  activeVersion: AvatarActiveVersion | null;
  /** Kept as its own field rather than derived at every call site: it is the
   *  gate V3-014's prompt host and V3-021's controls both read, and
   *  `activeVersion != null` repeated in two modules is two chances to disagree. */
  hasActiveVersion: boolean;
}

/**
 * Frozen version-skew rule (contract §3): an unknown `avatar_status` degrades
 * to `disabled`, i.e. avatar entries hide. Chosen direction matters — the
 * unknown state could be a *newer* usable one, and guessing it is usable would
 * put a consent-gated person-photo surface in front of a user on the strength
 * of a string this build cannot interpret.
 */
export function toAvatarStatus(raw: unknown): AvatarStatus {
  return typeof raw === 'string' && (AVATAR_STATUSES as readonly string[]).includes(raw)
    ? (raw as AvatarStatus)
    : 'disabled';
}

function toSourceType(raw: unknown): AvatarSourceType | null {
  return typeof raw === 'string' && (AVATAR_SOURCE_TYPES as readonly string[]).includes(raw)
    ? (raw as AvatarSourceType)
    : null;
}

function strOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export function toAvatarProfile(server: ServerAvatarProfile): AvatarProfile {
  const raw = server.candidate ?? null;
  // A candidate without its durable id is not addressable — there is no path
  // to POST consent for it — so it is dropped rather than rendered as a
  // half-usable prompt the user cannot answer.
  const sourceAssetId = raw ? strOrNull(raw.source_asset_id) : null;
  const version = server.active_version ?? null;
  // Same rule as the candidate: a version with no id is not addressable, so it is
  // dropped rather than rendered as a reference nobody can talk about. The URL is
  // allowed to be null (signing can fail) — the screen then says there is no
  // reference to show instead of rendering an empty frame.
  const versionId = version ? strOrNull(version.id) : null;
  return {
    status: toAvatarStatus(server.status),
    statusIsKnown:
      typeof server.status === 'string' &&
      (AVATAR_STATUSES as readonly string[]).includes(server.status),
    candidate:
      raw && sourceAssetId
        ? {
            sourceAssetId,
            sourceType: toSourceType(raw.source_type),
            previewUrl: strOrNull(raw.preview_url),
          }
        : null,
    consentVersion: server.consent ? strOrNull(server.consent.version) : null,
    consentedAt: server.consent ? strOrNull(server.consent.consented_at) : null,
    activeVersion:
      version && versionId
        ? {
            id: versionId,
            createdAt: strOrNull(version.created_at),
            canonicalFrontUrl: strOrNull(version.canonical_front_url),
          }
        : null,
    hasActiveVersion: server.active_version != null,
  };
}

/**
 * Is this profile a candidate this build may ask about?
 *
 * `status === 'candidate'` is the frozen §4.1 meaning of "qualified material
 * exists, not yet consented" — the eligibility judgement itself is V3-012's,
 * made server-side against the §7.4 minimums, and is deliberately not
 * re-litigated here.
 *
 * An unrecognized `sourceType` blocks the prompt. That looks over-strict for a
 * sheet whose copy never names the source, and it is deliberate: the prompt is
 * the one avatar surface with a *required* analytics field
 * (`v3_avatar_prompt_shown.source_type`), `trackV3` throws on a value outside
 * the frozen enum, and a consent prompt that cannot be attributed is not a
 * state this build is designed for. Degrading to "no prompt" is the safe
 * direction — never asking is safe, asking wrongly is not — and a build that
 * ships the new enum value asks normally.
 */
export function isPromptableCandidate(profile: AvatarProfile): boolean {
  return profile.status === 'candidate' && profile.candidate?.sourceType != null;
}

// --- Source C: a photo the user deliberately provides (frozen §4.2) ----------

export interface ServerAvatarUploadRegistration {
  detection_outcome: string;
  status: string;
}

export interface ServerAvatarPreparation {
  status: string;
  job_id: string;
  source_asset_id: string;
  created: boolean;
}

/**
 * Is a candidate coming, as far as `POST /v1/avatar-profile/uploads` knows?
 *
 * The registration response reports the *queue* outcome, not a verdict on the
 * photo: assessment happens later in `avatar_candidate_worker`. Three answers
 * are all a client can act on — wait for it, stop waiting, or the feature is
 * off — so the BE's seven-value vocabulary is collapsed to those here rather
 * than mirrored value for value.
 */
export type AvatarDetectionDisposition = 'watching' | 'not_watching' | 'unavailable';

/** Queued (or already queued for this photo): a candidate may appear. */
const DETECTION_WATCHING = ['enqueued', 'already_queued'] as const;
/** Nothing was queued and nothing will appear: no point waiting. */
const DETECTION_NOT_WATCHING = [
  'no_internal_object_key',
  'unresolvable_storage_bucket',
  'not_owned_object_key',
  'enqueue_failed',
] as const;

/**
 * Unknown outcomes degrade to `watching`, which is the opposite direction from
 * every other skew rule here — and deliberately so. This vocabulary is *not*
 * frozen by contract §4.2 (only the field's presence is), so it is the one
 * value space in this file that can grow without a contract change. Guessing
 * `not_watching` would tell a user their photo cannot be used without ever
 * looking at it; guessing `watching` costs a bounded wait and then reaches the
 * same honest "we could not use this photo" message. A delay is recoverable, a
 * false rejection is not.
 */
export function toDetectionDisposition(raw: unknown): AvatarDetectionDisposition {
  if ((DETECTION_WATCHING as readonly unknown[]).includes(raw)) return 'watching';
  if (raw === 'feature_disabled') return 'unavailable';
  if ((DETECTION_NOT_WATCHING as readonly unknown[]).includes(raw)) return 'not_watching';
  return 'watching';
}

export interface AvatarUploadRegistration {
  disposition: AvatarDetectionDisposition;
  /** Profile status at registration time — normally still `none`, because the
   *  assessment has not run yet. Carried because it is in the response, not
   *  because the wait depends on it. */
  status: AvatarStatus;
}

export function toAvatarUploadRegistration(
  server: ServerAvatarUploadRegistration,
): AvatarUploadRegistration {
  return {
    disposition: toDetectionDisposition(server.detection_outcome),
    status: toAvatarStatus(server.status),
  };
}

export interface AvatarPreparation {
  status: AvatarStatus;
  /** Did THIS request start work? A repeated prepare returns the existing job
   *  with `created=false` and buys nothing (V3-013 acceptance 2). */
  created: boolean;
}

/** `job_id` and `source_asset_id` are deliberately dropped: a job id is an
 *  internal handle with no client surface, and the asset is the one already on
 *  screen. Nothing here is persisted. */
export function toAvatarPreparation(server: ServerAvatarPreparation): AvatarPreparation {
  return { status: toAvatarStatus(server.status), created: server.created === true };
}

/**
 * How the on-demand setup path may legally start, given what the profile says.
 *
 * This is one rule with two consumers — whether the decision card shows a setup
 * entry at all, and which step the setup screen opens on — because they must
 * never disagree: an entry that renders for a state the screen cannot serve is
 * the dead end §3.6 forbids.
 *
 * The narrow cases are the load-bearing ones, and each is a property of the
 * backend rather than a preference:
 *
 * - **`none` is the ONLY state a new photo may be registered from.**
 *   `AvatarLifecycle.offer_candidate` moves `none → candidate` and returns false
 *   for every other status, so a photo registered while the profile sits
 *   anywhere else is assessed and then never offered. The client would wait,
 *   see nothing, and report "we could not use this photo" — a false statement
 *   about a photo that was fine.
 * - **`candidate` must consent to the material already on offer**, not upload
 *   more, for exactly the same reason. This is also the path back for the case
 *   V3-014 recorded: a decline whose POST was lost leaves the candidate
 *   consentable, and §7.3 allows re-explaining when the user asks for a preview.
 * - **`disabled` is `new_photo` (V3-021), and it used to be `blocked`.** Contract
 *   §4.1 lists `disabled → preparing` ("user re-enables via new consent"), and
 *   V3-013/V3-014 recorded that edge as having no reachable path: the profile
 *   stays `disabled` through a new assessment (`offer_candidate` only moves
 *   `none`, because moving would erase the revocation timestamp), so the
 *   qualified material existed while `GET /v1/avatar-profile` reported
 *   `candidate: null` and no client could learn its id. V3-021's widened
 *   `candidate` block reports material for every status except `preparing`, so
 *   the sequence register → poll → consent → prepare now completes from
 *   `disabled` — which is what stops Profile's 停止用于生成 control being a
 *   one-way door. The step order is IDENTICAL to a first-time setup, and that is
 *   why this is the same start value rather than a sixth one: both delete their
 *   source photo, so both re-enter through a new photo and a new consent.
 * - **`ready`/`refresh_recommended` are `already_ready`.** Consenting to fresh
 *   material while a version is live is the `replace` flow (V3-021), which
 *   `record_consent` deliberately keeps at `ready` so a working avatar is never
 *   taken away for a preparation that might fail.
 */
export type AvatarSetupStart =
  | 'new_photo'
  | 'consent_existing_candidate'
  | 'already_preparing'
  | 'already_ready'
  | 'blocked';

export function avatarSetupStart(profile: AvatarProfile): AvatarSetupStart {
  // A status this build cannot read is `blocked` even though it collapsed to
  // `disabled`, which is now a startable state. See `statusIsKnown`.
  if (!profile.statusIsKnown) return 'blocked';
  if (profile.status === 'none' || profile.status === 'disabled') return 'new_photo';
  if (profile.status === 'preparing') return 'already_preparing';
  if (profile.status === 'ready' || profile.status === 'refresh_recommended') {
    return 'already_ready';
  }
  // `candidate` with a source this build cannot name falls through to `blocked`,
  // the same direction `isPromptableCandidate` chose for the passive sheet: the
  // prompt event's `source_type` is required and `trackV3` throws on a value
  // outside the frozen enum, so an unattributable consent prompt is not a state
  // this build is designed for. A build shipping the new enum value works.
  if (isPromptableCandidate(profile)) return 'consent_existing_candidate';
  return 'blocked';
}

/**
 * Why a `prepare` call failed, in the only three shapes a client can act on.
 *
 * `409` is `conflict` rather than an error because the frozen envelope cannot
 * tell its four causes apart — `already_preparing`, `wrong_profile_state`,
 * `no_consented_source` and a missing profile all answer `4091 STATE_CONFLICT`.
 * Guessing "already running" would report work that may not exist, so the
 * caller re-reads the profile and lets the frozen `status` decide what the user
 * is told (see `preparationConflictOutcome`).
 */
export type AvatarPreparationFailure = 'conflict' | 'retryable' | 'unavailable';

export function toAvatarPreparationFailure(
  error: HttpErrorLike | null | undefined,
): AvatarPreparationFailure {
  const status = error?.response?.status ?? null;
  if (status === null) return 'retryable';
  if (status === 503) return 'unavailable';
  if (status === 409) return 'conflict';
  if (status === 429 || status >= 500) return 'retryable';
  return 'unavailable';
}

/**
 * What a post-409 profile read means for the user.
 *
 * `preparing` — work really is in flight, so the honest report is the same one a
 * fresh enqueue would produce. `ready`/`refresh_recommended` — an avatar exists
 * (another device, or a preparation that finished during the round trip), which
 * is the outcome the user asked for. Anything else means the conflict was not
 * benign and the caller still owes them a retry.
 */
export function preparationConflictOutcome(
  profile: AvatarProfile,
): 'preparing' | 'ready' | 'unresolved' {
  if (profile.status === 'preparing') return 'preparing';
  if (profile.status === 'ready' || profile.status === 'refresh_recommended') return 'ready';
  return 'unresolved';
}

// --- V3-021: the four §15 Profile controls ----------------------------------

export interface ServerAvatarDeletion {
  status: string;
  purge_derived: boolean;
  scheduled_object_count: number;
  purge_job_id?: string | null;
}

export interface AvatarDeletion {
  /** Frozen §4.2: always `disabled`. Read rather than assumed, so the screen
   *  renders what the server said instead of what we expected it to say. */
  status: AvatarStatus;
  /** Which control this was — echoed by the server, so a mismatch is visible. */
  purgedDerived: boolean;
}

/** `purge_job_id` and `scheduled_object_count` are deliberately dropped. A job
 *  id has no client surface, and an object count is an implementation detail of
 *  the sweep that would read as a promise about *how much* was removed — the
 *  §15 controls promise *what* is removed, and the count varies with how many
 *  canonical renders a version happened to have. */
export function toAvatarDeletion(server: ServerAvatarDeletion): AvatarDeletion {
  return {
    status: toAvatarStatus(server.status),
    purgedDerived: server.purge_derived === true,
  };
}

/**
 * Which of V3_SPEC §15's Profile controls this profile may offer, and why each
 * bound is the backend's rather than a preference.
 *
 * Every control here maps to a call the BE will accept in this state. That is the
 * whole point of computing it in one pure place: a control the API refuses is the
 * dead end §3.6 forbids, and it would be refused *after* the user tapped a
 * destructive-sounding button.
 *
 * - **`showsReference`** — §15's 查看当前形象参考. Keyed on the signed URL rather
 *   than on `hasActiveVersion`, because those can differ: `resolve_render_url`
 *   swallows a signing failure and returns null, and a "view" control that
 *   renders an empty frame is worse than one that says there is nothing to show.
 * - **`replace`** — `POST /v1/avatar-profile/replace` refuses without a version
 *   to swap out (`WRONG_PROFILE_STATE`), so it is offered only when one exists.
 *   The variant says where the new material comes from: `consent_offered_photo`
 *   when V3-021's widened `candidate` block is already carrying a qualified photo
 *   (consent it, then replace), otherwise `new_photo` (the §7.1 source-C flow).
 *   Never a bare "regenerate": re-preparing the SAME photo through the same
 *   pipeline composes `prepare`'s existing idempotency key, so it would return
 *   the completed job and change nothing — a button that reports success and
 *   does nothing.
 * - **`stopGeneration`** — 停止用于生成, `DELETE ?purge_derived=false`. Offered
 *   only when there is generation to stop: a live version, or a preparation on
 *   its way to one. Not for `candidate`, where nothing has been authorized yet
 *   and `delete` is the honest control for making the photo go away.
 * - **`deleteEverything`** — 删除形象参考及派生结果, `DELETE
 *   ?purge_derived=true`. Offered whenever a profile row exists (the endpoint
 *   answers 404 for `none`), INCLUDING `disabled` — that is the only way to
 *   remove the previews a previous 停止用于生成 deliberately kept, and
 *   `delete_avatar` is idempotent, so the second call sweeps exactly the objects
 *   the first one left.
 * - **`setUpAgain`** — the frozen `disabled → preparing` re-enable. Offered on
 *   `disabled` only, and only here: this screen is one the user opened, so it is
 *   not the 反复提醒 §7.3 forbids (see `previewSetupEntryVisible`, which stays
 *   silent for the same status for the opposite reason).
 *
 * `none` offers nothing at all, deliberately. Acquisition stays contextual
 * (§7.1/§3.4 — no mandatory onboarding, no new acquisition surface), so a profile
 * that never existed gets the state line and no call to action.
 */
export interface AvatarReferenceControls {
  showsReference: boolean;
  replace: 'new_photo' | 'consent_offered_photo' | null;
  stopGeneration: boolean;
  deleteEverything: boolean;
  setUpAgain: boolean;
}

export function avatarReferenceControls(profile: AvatarProfile): AvatarReferenceControls {
  const live =
    profile.statusIsKnown &&
    (profile.status === 'ready' || profile.status === 'refresh_recommended');
  const offered = profile.candidate != null;
  return {
    showsReference: profile.activeVersion?.canonicalFrontUrl != null,
    replace: live ? (offered ? 'consent_offered_photo' : 'new_photo') : null,
    stopGeneration: live || (profile.statusIsKnown && profile.status === 'preparing'),
    // Deliberately NOT gated on `statusIsKnown`. Every other control is, because
    // acting on a state we cannot read is guesswork — but deletion is the one
    // request whose worst case is that there was nothing left to delete, and a
    // client that hid it would strand a user's photos behind a status string this
    // build happens not to recognize. `none` is still excluded: the endpoint
    // answers 404, and offering a delete for material that never existed is a
    // control that can only fail.
    deleteEverything: !profile.statusIsKnown || profile.status !== 'none',
    setUpAgain: profile.statusIsKnown && profile.status === 'disabled',
  };
}

/**
 * §4.2: `accept=true` requires the consent copy version; `accept=false`
 * forbids it. The router refuses the wrong shape with `4001
 * VALIDATION_ERROR`, so an always-send body would fail every decline — which
 * is the path that must never break (acceptance 2).
 */
export function buildConsentBody(
  accept: boolean,
  consentVersion: string,
): { accept: true; consent_version: string } | { accept: false } {
  return accept ? { accept: true, consent_version: consentVersion } : { accept: false };
}

/**
 * Errors this surface can meet. Deliberately coarser than
 * `DecisionErrorState`: the passive discovery path treats *every* failure as
 * "no prompt" (see `AvatarCandidatePromptHost`), so only the user-initiated
 * consent POST needs states to render, and it needs exactly one distinction —
 * can the user usefully tap retry.
 */
export type AvatarConsentErrorState =
  /** `ENABLE_V3_AVATAR` off (503), or the candidate is gone / not ours (404),
   * or the profile moved on (409). Retrying cannot help; close the sheet. */
  | { kind: 'unavailable'; retryable: false }
  /** 429 / 5xx / no response at all — offer an explicit retry. */
  | { kind: 'retryable'; retryable: true };

export function toAvatarConsentErrorState(
  error: HttpErrorLike | null | undefined,
): AvatarConsentErrorState {
  const status = error?.response?.status ?? null;
  // No response at all is connectivity, which is the case retry exists for.
  if (status === null) return { kind: 'retryable', retryable: true };
  // 503 is the flag-off signal, NOT a transient server fault — it must be
  // tested before the 5xx branch that would otherwise swallow it and offer a
  // retry that can never succeed.
  if (status === 503) return { kind: 'unavailable', retryable: false };
  if (status === 429 || status >= 500) return { kind: 'retryable', retryable: true };
  return { kind: 'unavailable', retryable: false };
}
