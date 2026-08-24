// V3-019 — the static visual preview lifecycle, as pure logic (contract §6.1/
// §6.2 / V3_SPEC §9.5 / §3.6). Runtime-import-free — every import is type-only
// and therefore erased — so `scripts/visualPreviewMapping.test.ts` loads it
// directly in Node, the `avatarPhotoSetup.ts` / `shouldIBuyDecision.ts`
// pattern. The screen renders these states; it decides nothing.
//
// ## What this module owns
//
// The loop that actually stops. Contract §6.2 freezes the lifecycle
// (`queued → processing → quality_check → ready | failed |
// rejected_by_quality_gate`) and V3-001's evaluator carried one explicit
// instruction to this feature: an UNKNOWN generation status must degrade to
// the failed-equivalent display *in the polling code itself*, not in contract
// prose — a client that treats "not a status I know" as "keep waiting" spins
// forever the day the enum grows. So `classifyGenerationStatus` is a total
// function: everything that is not `ready` and not a known pending state IS a
// terminal no-result, by construction.
//
// ## Why `failed` and `rejected_by_quality_gate` are one state here
//
// §6.2's frozen degradation rule: FE renders the rejection with exactly the
// same user-facing copy and layout as a failure — the technical distinction is
// never exposed, low-quality results are hidden, never shown. Collapsing them
// in the *mapping layer* makes that rule structural: no screen can style them
// apart because no screen can see them apart. (`v3_preview_outcome`, the event
// that DOES distinguish them, is BE-owned and emitted at the terminal write.)
//
// ## Why there is a `still_working` state that is not a failure
//
// §9.5: generation may run in the background; leaving and coming back is a
// supported path, and the poll window is a bound on *watching*, not on the
// render. Exhausting it therefore stops the loop with an honest "still
// working" — never the failure copy, which would call a render dead while the
// worker may still finish it. Re-checking is safe and free by contract: §6.3's
// cache key means an identical POST returns the same asset without spending
// anything (V3-017 proved a cache hit costs no quota).

import type { AvatarSetupStart } from '@/api/avatarProfileMapping';
import type { DecisionVisualNeed } from '@/api/purchaseDecisionMapping';
import type { I18nKey } from '@/i18n';
import type { OutfitVisualAsset } from '@/types/api';

/** §6.1's preview-concern vocabulary — deliberately NOT §5.3's decision
 *  concern enum (V3-001 evaluator: two frozen enums, never unify). */
export const PREVIEW_CONCERNS = ['volume', 'color', 'length', 'overall'] as const;
export type PreviewConcern = (typeof PREVIEW_CONCERNS)[number];

/** The frozen §6.1 request body. `consent: true` is the per-request
 *  confirmation that THIS render of the user's likeness was asked for —
 *  distinct from V3-013's avatar-level consent, which authorizes keeping the
 *  reference, not any particular use of it. The tap that sends this body sits
 *  under copy naming the likeness use, so the value is informed rather than
 *  assumed; the final production consent wording stays a human gate. */
export interface VisualPreviewRequestBody {
  view_type: 'static_tryon';
  concern: PreviewConcern;
  consent: true;
}

export function previewRequestBody(concern: PreviewConcern): VisualPreviewRequestBody {
  return { view_type: 'static_tryon', concern, consent: true };
}

/** §6.2's non-terminal states. A member added here without a matching server
 *  release is harmless; a member the server adds without a client release is
 *  the unknown-status case, which classifies as `no_result` — the safe
 *  direction (§3's version-skew rule: degrade, never spin). */
export const PREVIEW_PENDING_STATUSES = ['queued', 'processing', 'quality_check'] as const;

export type PreviewStatusClass = 'ready' | 'pending' | 'no_result';

/** Total over every string the wire can carry. `ready` and the three known
 *  pending states are themselves; everything else — `failed`,
 *  `rejected_by_quality_gate`, and any status this build has never heard of —
 *  is the one collapsed no-result class (frozen §6.2 degradation rule). */
export function classifyGenerationStatus(status: string): PreviewStatusClass {
  if (status === 'ready') return 'ready';
  if ((PREVIEW_PENDING_STATUSES as readonly string[]).includes(status)) return 'pending';
  return 'no_result';
}

/**
 * How long to watch, and why the window is wider than the avatar setup's.
 *
 * The avatar assessment is a fast classifier (15 s bounded); a try-on render
 * is a provider round-trip plus a quality gate plus at most one budgeted
 * regeneration, so the watch window allows for two full renders before it
 * hands the wait to the background (~60 s). Still no countdown and no
 * percentage — §9.5 forbids promising a time we cannot keep.
 */
export const PREVIEW_POLL_ATTEMPTS = 24;
export const PREVIEW_POLL_INTERVAL_MS = 2500;

/** Delay before poll `attempt` (0-based), or null when the window is spent. */
export function nextPreviewPollDelayMs(attempt: number): number | null {
  return attempt < PREVIEW_POLL_ATTEMPTS ? PREVIEW_POLL_INTERVAL_MS : null;
}

/**
 * The lifecycle the screen renders. One phase at a time, and every phase
 * keeps the decision card fully intact underneath it — §3.6: a preview
 * failure must never become a product burden, and §9.5's failure copy points
 * the user back at the wardrobe judgment rather than at a retry treadmill.
 */
export type PreviewPhase =
  /** Nothing asked yet — the entry row is on screen. */
  | { kind: 'idle' }
  /** The tap landed and the POST is in flight. Rendered identically to
   *  `generating` (the same §9.5 line) so the feedback is immediate — a tap
   *  that changes nothing on screen for a network round-trip reads as a dead
   *  button. */
  | { kind: 'requesting' }
  /** POST answered; the §9.5 status line is on screen and the poll is live. */
  | { kind: 'generating'; assetId: string; pollAttempt: number }
  /** Terminal: the render exists and may be shown. */
  | { kind: 'ready'; assetId: string; imageUrl: string }
  /** Terminal: failed, rejected by the quality gate, or a status this build
   *  cannot name — one state, one copy (§6.2's frozen degradation rule). The
   *  decision evidence below is the way forward; no retry is offered (§3.6:
   *  "不要求用户反复重试"). */
  | { kind: 'no_result' }
  /** The watch window is spent but the render is not dead — §9.5's background
   *  path. Re-checking re-enters `generating` via the same idempotent POST. */
  | { kind: 'still_working'; assetId: string }
  /** The request was refused or failed before any render started. The card
   *  quietly returns to the decision evidence; `reason` picks the caption. */
  | { kind: 'unavailable'; reason: PreviewUnavailableReason };

export const IDLE: PreviewPhase = { kind: 'idle' };
export const REQUESTING: PreviewPhase = { kind: 'requesting' };

/** P0's one honest concern value. The decision flow asked its §5.3 question
 *  with `concern: "none"` (V3-009), and §5.3's vocabulary has no member in
 *  §6.1's — mapping one onto the other would invent a doubt the user never
 *  stated. `overall` is §6.1's catch-all; the server does not consume it
 *  either way (the §6.3 cache key excludes it by contract). */
export const DEFAULT_PREVIEW_CONCERN: PreviewConcern = 'overall';

/** The POST landed. A cache hit may already be terminal, but the response
 *  carries no image URL, so every accepted request enters `generating` and
 *  lets the first poll settle it — for a cached `ready` that is one GET. */
export function previewRequested(assetId: string): PreviewPhase {
  return { kind: 'generating', assetId, pollAttempt: 0 };
}

/**
 * One poll came back. Terminal states stop the loop (acceptance 3):
 *
 * - `ready` with a URL → show it.
 * - `ready` WITHOUT a URL → `no_result`. A ready row whose signed URL did not
 *   materialize has nothing to show, and showing "ready" with no image is the
 *   dead end §3.6 forbids; the honest rendering of that state is the failure
 *   copy. (Unreachable against today's BE — `image_url` is non-null exactly
 *   when `ready` — but a total mapping cannot assume that.)
 * - `failed` / `rejected_by_quality_gate` / unknown → `no_result`.
 * - a known pending state → keep watching until the window is spent, then
 *   `still_working` (not a failure — the render may finish behind us).
 */
export function previewPolled(phase: PreviewPhase, asset: OutfitVisualAsset): PreviewPhase {
  if (phase.kind !== 'generating') return phase;
  const cls = classifyGenerationStatus(asset.generationStatus);
  if (cls === 'ready') {
    return asset.imageUrl
      ? { kind: 'ready', assetId: phase.assetId, imageUrl: asset.imageUrl }
      : { kind: 'no_result' };
  }
  if (cls === 'no_result') return { kind: 'no_result' };
  const attempt = phase.pollAttempt + 1;
  if (nextPreviewPollDelayMs(attempt) === null) {
    return { kind: 'still_working', assetId: phase.assetId };
  }
  return { kind: 'generating', assetId: phase.assetId, pollAttempt: attempt };
}

/** A poll GET itself failed (network, 5xx, expired session). One transient
 *  read must not kill a render that is still running: the attempt is charged
 *  and the loop continues, so a single blip costs one slot of the window
 *  rather than the preview. A *persistently* unreachable server therefore
 *  drains into `still_working` — the state whose copy already says "come back
 *  later" — not into the failure copy, which would call a live render dead. */
export function previewPollErrored(phase: PreviewPhase): PreviewPhase {
  if (phase.kind !== 'generating') return phase;
  const attempt = phase.pollAttempt + 1;
  if (nextPreviewPollDelayMs(attempt) === null) {
    return { kind: 'still_working', assetId: phase.assetId };
  }
  return { kind: 'generating', assetId: phase.assetId, pollAttempt: attempt };
}

// --- the create call's refusal vocabulary --------------------------------------

/** Why no preview can be offered right now. Each maps to one calm caption in
 *  the layer-4 slot; none of them touches the decision card. */
export type PreviewUnavailableReason =
  /** 4091 `avatar_not_ready` — unreachable from an entry gated on a ready
   *  profile, but the server may know something newer than our probe. */
  | 'avatar_not_ready'
  /** 4091 `no_renderable_candidate` / `no_grounded_outfit`, and any 4091 this
   *  build cannot name: the decision's state does not permit a preview, and no
   *  user action changes that — a classified state, not an error (the V3-017
   *  handoff, resolved here). */
  | 'no_preview_possible'
  /** 429 `daily_budget_exhausted` (or a 429 with no reason, from a server that
   *  predates V3-026) — the daily generation quota is spent. Calm, and honest
   *  that the wardrobe judgment is unaffected. Clears tomorrow. */
  | 'quota_exhausted'
  /** 429 `retry_budget_exhausted` — V3-026. THIS generation has used its
   *  bounded retry allowance and will not be attempted again, ever. Told apart
   *  from `quota_exhausted` because the two clear on different horizons and
   *  only one of them is a "come back later": captioning this one as today's
   *  allowance would promise a preview that is never coming. */
  | 'retry_exhausted'
  /** 503 — the flag is off (or the surface is mid-rollback). The entry hides
   *  on the next decision; this covers the one that was already on screen. */
  | 'feature_unavailable'
  /** Network / 5xx / anything else. Transient, so the entry stays available;
   *  the caption does not promise anything about a retry. */
  | 'error';

/** The minimal error surface this module reads — the envelope's `data.reason`
 *  ridealong plus the status. Structural (no axios import) so the mapping
 *  stays Node-testable, the `HttpErrorLike` pattern. */
export interface PreviewHttpErrorLike {
  response?: {
    status?: number | null;
    data?: { data?: { reason?: string | null } | null } | null;
  } | null;
}

/** §6.1's refusal mapping, from the wire. A 4091 whose `data.reason` is
 *  missing (older server) or unrecognized (newer server) degrades to
 *  `no_preview_possible` — the generic 4091 treatment the router's docstring
 *  promises is safe in both skew directions.
 *
 *  A 429 degrades the same way and in the same direction: V3-026 gave that
 *  status two meanings, and a server that predates it sends no reason at all,
 *  so anything but `retry_budget_exhausted` reads as the daily quota. That is
 *  the safe default of the two — it under-promises finality rather than telling
 *  a user their preview is permanently gone when it is not. */
export function toPreviewUnavailableReason(
  error: PreviewHttpErrorLike | null | undefined,
): PreviewUnavailableReason {
  const status = error?.response?.status ?? null;
  if (status === 409) {
    const reason = error?.response?.data?.data?.reason ?? null;
    return reason === 'avatar_not_ready' ? 'avatar_not_ready' : 'no_preview_possible';
  }
  if (status === 429) {
    const reason = error?.response?.data?.data?.reason ?? null;
    return reason === 'retry_budget_exhausted' ? 'retry_exhausted' : 'quota_exhausted';
  }
  if (status === 503) return 'feature_unavailable';
  return 'error';
}

// --- what the phases mean for events and copy -----------------------------------

/**
 * `v3_preview_viewed`'s frozen result, or null when nothing view-shaped
 * happened. `ready` → `shown`; `no_result` → `fallback` (the §9.5 failure copy
 * IS the fallback view — the user was returned to the decision evidence).
 * `still_working` and the refusals emit nothing: no render outcome was viewed,
 * and a guessed value would poison the preview-usefulness denominator.
 */
export function previewViewedResult(phase: PreviewPhase): 'shown' | 'fallback' | null {
  if (phase.kind === 'ready') return 'shown';
  if (phase.kind === 'no_result') return 'fallback';
  return null;
}

/** Is the lifecycle over — nothing left to watch? (`still_working` is not
 *  terminal: the check-again affordance re-enters the loop.) */
export function previewIsSettled(phase: PreviewPhase): boolean {
  return phase.kind === 'ready' || phase.kind === 'no_result' || phase.kind === 'unavailable';
}

/**
 * May the entry row fire (again)? `idle` is the first ask; `still_working`
 * re-checks a render we stopped watching; `error` retries a request that
 * never started anything. The other refusals are answers, not obstacles —
 * re-asking cannot change them, so the row is not offered (§3.6: no retry
 * treadmill). `no_result` is final for the same reason: §6.3 serves the same
 * rejected asset from cache, so "try again" would be a button that replays
 * the failure copy at the user.
 */
export function previewRequestAllowed(phase: PreviewPhase): boolean {
  return (
    phase.kind === 'idle' ||
    phase.kind === 'still_working' ||
    (phase.kind === 'unavailable' && phase.reason === 'error')
  );
}

/**
 * Should the decision card offer the GENERATE entry at all? The exact mirror
 * of V3-015's `previewSetupEntryVisible`, covering the profile state that one
 * deliberately left empty ("already_ready shows nothing *yet*: generating the
 * preview is V3-019/V3-020"). The two are disjoint by construction — one
 * serves users without a usable reference, this one serves users with one —
 * so the layer-4 slot never has to arbitrate between them.
 *
 * Same `visual_need` gate, same reasoning: V3-007 sets `none` exactly when
 * text and wardrobe evidence already answer the question (acceptance 3 of
 * V3-007), unknown values were already coerced to `none` in the wire mapping,
 * and offering a likeness render nobody needs is §3.4's gratuitous prompting.
 * `already_preparing` renders nothing: an entry that answers "still preparing,
 * wait" is a button that leads nowhere real.
 */
export function previewGenerateEntryVisible(args: {
  visualNeed: DecisionVisualNeed;
  start: AvatarSetupStart;
}): boolean {
  if (args.visualNeed === 'none') return false;
  return args.start === 'already_ready';
}

/**
 * The calm caption for a refusal, or null when the slot should render nothing
 * at all. Null is deliberate twice: `feature_unavailable` is contract §2
 * rollback rule 2 (an optional V3 surface self-hides rather than explaining
 * itself), and `avatar_not_ready` means our profile probe was staler than the
 * server — the SETUP entry is the surface that owns that conversation, and a
 * caption here would argue with it.
 */
export function previewUnavailableCaptionKey(reason: PreviewUnavailableReason): I18nKey | null {
  switch (reason) {
    case 'no_preview_possible':
      return 'should_i_buy.preview.notPossible';
    case 'quota_exhausted':
      return 'should_i_buy.preview.quotaExhausted';
    case 'retry_exhausted':
      return 'should_i_buy.preview.retryExhausted';
    case 'error':
      return 'should_i_buy.preview.requestFailed';
    case 'avatar_not_ready':
    case 'feature_unavailable':
      return null;
  }
}
