/**
 * V3-014 — the frozen §4 avatar contract as pure data.
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

export interface AvatarProfile {
  status: AvatarStatus;
  candidate: AvatarCandidate | null;
  consentVersion: string | null;
  consentedAt: string | null;
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
  return {
    status: toAvatarStatus(server.status),
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
