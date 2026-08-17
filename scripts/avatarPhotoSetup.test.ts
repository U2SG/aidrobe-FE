// V3-015 — regression coverage for the on-demand photo setup: the two frozen
// source-C surfaces, the rule that decides how a setup may start, the entry
// gate on the decision card, and the step machine behind the screen.
// Run:  node scripts/avatarPhotoSetup.test.ts   (Node >= 22 type-stripping)
//
// Everything here is reachable without a simulator because the logic lives in
// RN-free modules; what the user actually sees is evidenced separately by the
// browser driver in .agent-artifacts/v3-015/.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  avatarSetupStart,
  preparationConflictOutcome,
  toAvatarPreparation,
  toAvatarPreparationFailure,
  toAvatarUploadRegistration,
  toAvatarProfile,
  toDetectionDisposition,
  type ServerAvatarProfile,
} from '../src/api/avatarProfileMapping.ts';
import {
  AVATAR_SETUP_POLL_ATTEMPTS,
  AVATAR_SETUP_POLL_INTERVAL_MS,
  SOURCE_C_SOURCE_TYPE,
  candidateDismissed,
  consentFailed,
  consentRecorded,
  consentSubmitted,
  detectionPolled,
  dismissFailed,
  dismissSubmitted,
  initialAvatarSetupState,
  nextSetupPollDelayMs,
  photoPickCancelled,
  photoPickDenied,
  photoPicked,
  photoRegistered,
  preparationFailed,
  preparationSettled,
  previewSetupEntryVisible,
  promptSourceType,
  registrationFailed,
  retryTarget,
  setupIsTerminal,
  setupUnavailable,
  uploadFailed,
} from '../src/screens/avatar/avatarPhotoSetup.ts';
import {
  AVATAR_CONSENT_CLAUSE_KEYS,
  AVATAR_CONSENT_COPY_KEYS,
} from '../src/i18n/avatarConsentCopy.ts';
import { DECISION_VISUAL_NEEDS } from '../src/api/purchaseDecisionMapping.ts';
import { V3_AVATAR_PROMPT_CONTEXTS, V3_AVATAR_SOURCES } from '../src/utils/v3AnalyticsEvents.ts';
import { zhCN } from '../src/i18n/zh-CN.ts';
import { enUS } from '../src/i18n/en-US.ts';

let checks = 0;
const check = (label: string, fn: () => void) => {
  fn();
  checks += 1;
  console.log(`  ✓ ${label}`);
};

const profile = (over: Partial<ServerAvatarProfile> = {}): ServerAvatarProfile => ({
  status: 'none',
  active_version: null,
  candidate: null,
  consent: null,
  ...over,
});

const candidateProfile = (sourceType = 'user_upload') =>
  profile({
    status: 'candidate',
    candidate: {
      source_asset_id: 'asset-9',
      source_type: sourceType,
      preview_url: 'https://example.test/signed/candidate.jpg?sig=x',
    },
  });

/** What the screen actually renders and calls, read from its source rather than
 *  restated, so these assertions are about what ships. */
const SCREEN_SOURCE = readFileSync(
  new URL('../src/screens/avatar/AvatarPhotoSetupScreen.tsx', import.meta.url),
  'utf8',
);

// --- Registration and preparation shapes (frozen §4.2) -------------------------
console.log('§4.2 source-C surfaces');

check('a queued detection means the client should wait', () => {
  for (const raw of ['enqueued', 'already_queued']) {
    assert.equal(toDetectionDisposition(raw), 'watching');
  }
});

check('the flag being off is reported as unavailable, never as a bad photo', () => {
  assert.equal(toDetectionDisposition('feature_disabled'), 'unavailable');
});

check('an outcome that queued nothing stops the wait immediately', () => {
  for (const raw of [
    'no_internal_object_key',
    'unresolvable_storage_bucket',
    'not_owned_object_key',
    'enqueue_failed',
  ]) {
    assert.equal(toDetectionDisposition(raw), 'not_watching');
  }
});

check('an UNKNOWN outcome waits rather than rejecting the photo', () => {
  // The one skew rule in this contract that degrades towards doing more work:
  // this vocabulary is not frozen by §4.2, and a false "we cannot use your
  // photo" is worse than a bounded wait that ends with the same message.
  for (const raw of ['queued_behind_others', undefined, null, 7, '']) {
    assert.equal(toDetectionDisposition(raw), 'watching');
  }
});

check('the registration response maps to a disposition plus a skew-safe status', () => {
  assert.deepEqual(
    toAvatarUploadRegistration({ detection_outcome: 'enqueued', status: 'none' }),
    { disposition: 'watching', status: 'none' },
  );
  // Unknown status ⇒ `disabled`, the frozen §3 direction for every avatar status.
  assert.equal(
    toAvatarUploadRegistration({ detection_outcome: 'enqueued', status: 'hologram' }).status,
    'disabled',
  );
});

check('the preparation response keeps only status and created', () => {
  const mapped = toAvatarPreparation({
    status: 'preparing',
    job_id: 'job-1',
    source_asset_id: 'asset-9',
    created: true,
  });
  assert.deepEqual(mapped, { status: 'preparing', created: true });
  // `job_id` is an internal handle; it must not reach the client shape at all.
  assert.equal('job_id' in mapped, false);
  assert.equal('source_asset_id' in mapped, false);
});

check('a non-boolean `created` never reads as "work started"', () => {
  assert.equal(
    toAvatarPreparation({
      status: 'preparing',
      job_id: 'j',
      source_asset_id: 'a',
      created: undefined as unknown as boolean,
    }).created,
    false,
  );
});

// --- How a setup may start (the rule both consumers share) ---------------------
console.log('avatarSetupStart');

check('only `none` may register a NEW photo', () => {
  assert.equal(avatarSetupStart(toAvatarProfile(profile({ status: 'none' }))), 'new_photo');
});

check('`candidate` consents to the material already on offer, never uploads more', () => {
  // `AvatarLifecycle.offer_candidate` moves `none → candidate` ONLY, so a photo
  // registered from any other state is assessed and then never offered — the
  // client would wait and then report a false "we could not use this photo".
  assert.equal(
    avatarSetupStart(toAvatarProfile(candidateProfile())),
    'consent_existing_candidate',
  );
});

check('a candidate this build cannot attribute is blocked, not silently consented', () => {
  assert.equal(avatarSetupStart(toAvatarProfile(candidateProfile('holo_scan'))), 'blocked');
});

check('a candidate with no durable id is blocked (there is nothing to POST against)', () => {
  const orphan = profile({
    status: 'candidate',
    candidate: { source_asset_id: '', source_type: 'user_upload' },
  });
  assert.equal(avatarSetupStart(toAvatarProfile(orphan)), 'blocked');
});

check('work already under way, or already done, is terminal rather than an error', () => {
  assert.equal(avatarSetupStart(toAvatarProfile(profile({ status: 'preparing' }))), 'already_preparing');
  for (const status of ['ready', 'refresh_recommended']) {
    assert.equal(avatarSetupStart(toAvatarProfile(profile({ status }))), 'already_ready');
  }
});

check('a revoked profile is blocked — P0 has no reachable re-enable path', () => {
  // Contract §4.1 lists `disabled → preparing`, but V3-013 recorded that edge as
  // unreachable: `offer_candidate` will not move a disabled profile, so no
  // candidate can ever be offered to consent against. Uploading a photo that
  // provably cannot become an avatar would be the dead end §3.6 forbids.
  assert.equal(avatarSetupStart(toAvatarProfile(profile({ status: 'disabled' }))), 'blocked');
});

check('an unknown status degrades to blocked, not to an upload invitation', () => {
  assert.equal(avatarSetupStart(toAvatarProfile(profile({ status: 'hologram_ready' }))), 'blocked');
});

// --- The entry gate on the decision card --------------------------------------
console.log('previewSetupEntryVisible (the full matrix)');

const STARTS = [
  'new_photo',
  'consent_existing_candidate',
  'already_preparing',
  'already_ready',
  'blocked',
] as const;

check('visual_need=none never offers the entry, whatever the profile says', () => {
  for (const start of STARTS) {
    assert.equal(previewSetupEntryVisible({ visualNeed: 'none', start }), false);
  }
});

check('the entry appears only for the two states this flow can serve', () => {
  const servable = new Set(['new_photo', 'consent_existing_candidate']);
  for (const visualNeed of DECISION_VISUAL_NEEDS) {
    for (const start of STARTS) {
      assert.equal(
        previewSetupEntryVisible({ visualNeed, start }),
        visualNeed !== 'none' && servable.has(start),
        `${visualNeed} × ${start}`,
      );
    }
  }
});

check('the matrix covers every frozen visual_need value', () => {
  assert.deepEqual([...DECISION_VISUAL_NEEDS], ['none', 'helpful', 'recommended']);
});

// --- The prompt event ----------------------------------------------------------
console.log('v3_avatar_prompt_shown');

check('this surface reports the source_type the SERVER will record', () => {
  // `register_avatar_upload` passes `AvatarSourceType.USER_UPLOAD` for every
  // photo registered here — album or camera. Reporting `camera_capture` would
  // name a value no asset carries and break the join with the BE-emitted
  // `v3_avatar_consent`.
  assert.equal(SOURCE_C_SOURCE_TYPE, 'user_upload');
  assert.ok(V3_AVATAR_SOURCES.includes(SOURCE_C_SOURCE_TYPE));
  assert.equal(promptSourceType('new_photo', null), 'user_upload');
});

check('an existing candidate is attributed to its own source', () => {
  const withCandidate = toAvatarProfile(candidateProfile('ootd_photo'));
  assert.equal(
    promptSourceType('consent_existing_candidate', withCandidate.candidate),
    'ootd_photo',
  );
});

check('a state that shows no ask emits no prompt', () => {
  for (const start of ['already_preparing', 'already_ready', 'blocked'] as const) {
    assert.equal(promptSourceType(start, null), null);
  }
});

check('the context this surface uses is in the frozen enum', () => {
  assert.ok(V3_AVATAR_PROMPT_CONTEXTS.includes('preview_request'));
});

// --- Opening the screen --------------------------------------------------------
console.log('initial state');

check('a fresh profile opens on the intro — purpose before any picker', () => {
  const state = initialAvatarSetupState('new_photo', null);
  assert.equal(state.step, 'intro');
  assert.equal(state.candidate, null);
  assert.equal(state.pickedUri, null);
});

check('an existing candidate opens on review WITH the photo consent will name', () => {
  const withCandidate = toAvatarProfile(candidateProfile());
  const state = initialAvatarSetupState('consent_existing_candidate', withCandidate.candidate);
  assert.equal(state.step, 'review');
  assert.equal(state.candidate?.sourceAssetId, 'asset-9');
});

check('terminal starts open terminal, and a revoked one states the reason', () => {
  assert.equal(initialAvatarSetupState('already_preparing', null).step, 'preparing');
  assert.equal(initialAvatarSetupState('already_ready', null).step, 'ready');
  assert.ok(setupIsTerminal(initialAvatarSetupState('already_ready', null)));
  const blocked = initialAvatarSetupState('blocked', null);
  assert.equal(blocked.step, 'problem');
  assert.equal(blocked.problem, 'revoked');
  assert.equal(retryTarget(blocked), null, 'a revoked profile must not offer a retry');
});

check('a failed opening read hides the surface instead of blaming the photo', () => {
  const state = setupUnavailable(initialAvatarSetupState('new_photo', null));
  assert.equal(state.problem, 'unavailable');
  assert.equal(retryTarget(state), null);
});

// --- Acceptance 3: permission denial and cancellation are recoverable ----------
console.log('acceptance 3 — denial and cancellation');

const intro = initialAvatarSetupState('new_photo', null);

check('a denial is a recoverable state, and the recovery is picking again', () => {
  const denied = photoPickDenied(intro, 'camera');
  assert.equal(denied.step, 'problem');
  assert.equal(denied.problem, 'permission_denied');
  assert.equal(retryTarget(denied), 'pick');
  assert.equal(denied.pickedUri, null, 'nothing was uploaded, so nothing is held');
});

check('cancelling returns to exactly the state before it, with nothing said', () => {
  const cancelled = photoPickCancelled(intro);
  assert.deepEqual(cancelled, intro);
});

check('cancelling after a denial clears the denial message', () => {
  // Otherwise a user who granted permission in Settings and cancelled the next
  // picker would still be reading "access has not been granted".
  const cancelled = photoPickCancelled(photoPickDenied(intro, 'album'));
  assert.equal(cancelled.step, 'intro');
  assert.equal(cancelled.problem, null);
});

check('a denial then a successful pick proceeds normally', () => {
  const picked = photoPicked(photoPickDenied(intro, 'album'), 'album', 'file:///a.jpg');
  assert.equal(picked.step, 'uploading');
  assert.equal(picked.problem, null);
  assert.equal(picked.pickedUri, 'file:///a.jpg');
  assert.equal(picked.source, 'album');
});

// --- Upload, registration, assessment -----------------------------------------
console.log('upload → registration → assessment');

const uploading = photoPicked(intro, 'album', 'file:///a.jpg');

check('a failed upload retries the SAME photo, not a new pick', () => {
  const failed = uploadFailed(uploading);
  assert.equal(failed.problem, 'upload_failed');
  assert.equal(retryTarget(failed), 'upload');
});

check('a failed upload with no photo left falls back to picking', () => {
  const failed = uploadFailed({ ...uploading, pickedUri: null });
  assert.equal(retryTarget(failed), 'pick');
});

check('a transient registration failure is recoverable; a permanent one is not', () => {
  assert.equal(retryTarget(registrationFailed(uploading, true)), 'upload');
  const permanent = registrationFailed(uploading, false);
  assert.equal(permanent.problem, 'unavailable');
  assert.equal(retryTarget(permanent), null);
});

check('a queued photo starts the bounded wait at attempt zero', () => {
  const detecting = photoRegistered(uploading, 'watching');
  assert.equal(detecting.step, 'detecting');
  assert.equal(detecting.pollAttempt, 0);
});

check('nothing queued says "not this photo" immediately, without a 15s wait', () => {
  const stopped = photoRegistered(uploading, 'not_watching');
  assert.equal(stopped.problem, 'photo_unusable');
  assert.equal(retryTarget(stopped), 'pick');
});

check('the flag flipping off mid-flow is unavailable, not a bad photo', () => {
  assert.equal(photoRegistered(uploading, 'unavailable').problem, 'unavailable');
});

check('the wait is bounded and fixed, and its window is stated in constants', () => {
  assert.equal(AVATAR_SETUP_POLL_ATTEMPTS, 10);
  assert.equal(AVATAR_SETUP_POLL_INTERVAL_MS, 1500);
  for (let attempt = 0; attempt < AVATAR_SETUP_POLL_ATTEMPTS; attempt += 1) {
    assert.equal(nextSetupPollDelayMs(attempt), AVATAR_SETUP_POLL_INTERVAL_MS);
  }
  assert.equal(nextSetupPollDelayMs(AVATAR_SETUP_POLL_ATTEMPTS), null);
});

check('a candidate arriving mid-wait moves straight to review', () => {
  const detecting = photoRegistered(uploading, 'watching');
  const found = detectionPolled(detecting, toAvatarProfile(candidateProfile()).candidate);
  assert.equal(found.step, 'review');
  assert.equal(found.candidate?.sourceAssetId, 'asset-9');
});

check('the wait cannot spin: it ends at exactly the declared attempt count', () => {
  let state = photoRegistered(uploading, 'watching');
  for (let i = 0; i < AVATAR_SETUP_POLL_ATTEMPTS - 1; i += 1) {
    state = detectionPolled(state, null);
    assert.equal(state.step, 'detecting', `attempt ${i} must keep waiting`);
  }
  state = detectionPolled(state, null);
  assert.equal(state.step, 'problem');
  assert.equal(state.problem, 'photo_unusable');
  assert.equal(retryTarget(state), 'pick', 'the way out is another photo');
});

// --- The answer, and the retry that must not replay it ------------------------
console.log('consent → prepare');

const review = initialAvatarSetupState(
  'consent_existing_candidate',
  toAvatarProfile(candidateProfile()).candidate,
);

check('submitting locks the step and clears any previous problem', () => {
  const submitting = consentSubmitted(consentFailed(review, true));
  assert.equal(submitting.step, 'submitting');
  assert.equal(submitting.problem, null);
});

check('a failed consent retries the consent', () => {
  const failed = consentFailed(consentSubmitted(review), true);
  assert.equal(failed.problem, 'consent_failed');
  assert.equal(retryTarget(failed), 'consent');
});

check('an unretryable consent failure offers no retry at all', () => {
  const failed = consentFailed(consentSubmitted(review), false);
  assert.equal(failed.problem, 'unavailable');
  assert.equal(retryTarget(failed), null);
});

check('ONCE CONSENT IS RECORDED, every retry resumes at prepare', () => {
  // The case that would otherwise dead-end forever: `record_consent` refuses to
  // re-decide a decided asset (`4091`), so a retry that replayed the whole answer
  // would fail on a request the user already completed successfully.
  const recorded = consentRecorded(consentSubmitted(review));
  assert.equal(recorded.consentRecorded, true);
  assert.equal(retryTarget(consentFailed(recorded, true)), 'prepare');
  assert.equal(retryTarget(preparationFailed(recorded, 'retryable')), 'prepare');
});

check('a preparation failure says the choice was saved and stays retryable', () => {
  const failed = preparationFailed(consentRecorded(review), 'retryable');
  assert.equal(failed.problem, 'preparation_failed');
  assert.equal(retryTarget(failed), 'prepare');
});

check('an unavailable preparation is terminal, not a retry loop', () => {
  const failed = preparationFailed(consentRecorded(review), 'unavailable');
  assert.equal(failed.problem, 'unavailable');
  assert.equal(retryTarget(failed), null);
});

check('a preparing profile reports work in flight', () => {
  const settled = preparationSettled(consentRecorded(review), 'preparing');
  assert.equal(settled.step, 'preparing');
  assert.ok(setupIsTerminal(settled));
});

check('the retry-after-failure shape (`candidate` + a live job) also reports work', () => {
  // `AvatarLifecycle.begin_preparation` re-enters `preparing` from `candidate`,
  // so a prepare answered while the row still reads `candidate` is running work.
  assert.equal(preparationSettled(review, 'candidate').step, 'preparing');
});

check('a profile that finished during the round trip reports ready', () => {
  for (const status of ['ready', 'refresh_recommended'] as const) {
    assert.equal(preparationSettled(review, status).step, 'ready');
  }
});

check('a conflict that resolves to neither leaves the retry standing', () => {
  const unresolved = preparationSettled(consentRecorded(review), 'unresolved');
  assert.equal(unresolved.problem, 'preparation_failed');
  assert.equal(retryTarget(unresolved), 'prepare');
});

check('every non-preparing, non-ready status is treated as unresolved', () => {
  for (const status of ['none', 'disabled'] as const) {
    assert.equal(preparationSettled(review, status).problem, 'preparation_failed');
  }
});

// --- 409 disambiguation --------------------------------------------------------
console.log('prepare failures');

const err = (status: number | null) =>
  status === null ? { response: undefined } : { response: { status } };

check('409 is a conflict to be settled by a profile read, not an error to show', () => {
  assert.equal(toAvatarPreparationFailure(err(409)), 'conflict');
});

check('503 is the flag-off signal and must not be swallowed by the 5xx branch', () => {
  assert.equal(toAvatarPreparationFailure(err(503)), 'unavailable');
});

check('429, 5xx and no response at all are the retryable cases', () => {
  for (const status of [429, 500, 502, 504]) {
    assert.equal(toAvatarPreparationFailure(err(status)), 'retryable');
  }
  assert.equal(toAvatarPreparationFailure(err(null)), 'retryable');
  assert.equal(toAvatarPreparationFailure(null), 'retryable');
});

check('a 404 cannot be fixed by tapping again', () => {
  assert.equal(toAvatarPreparationFailure(err(404)), 'unavailable');
});

check('the post-conflict read is decided by the frozen status, never by a guess', () => {
  assert.equal(preparationConflictOutcome(toAvatarProfile(profile({ status: 'preparing' }))), 'preparing');
  assert.equal(preparationConflictOutcome(toAvatarProfile(profile({ status: 'ready' }))), 'ready');
  assert.equal(
    preparationConflictOutcome(toAvatarProfile(profile({ status: 'refresh_recommended' }))),
    'ready',
  );
  for (const status of ['none', 'candidate', 'disabled']) {
    assert.equal(
      preparationConflictOutcome(toAvatarProfile(profile({ status }))),
      'unresolved',
      status,
    );
  }
});

// --- Choosing another photo ----------------------------------------------------
console.log('choose another photo');

// The control that must dismiss before it can offer. Round 2 shipped it as a
// local reset, which could not work: `_suppression` returns
// `CANDIDATE_ALREADY_OFFERED` for ANY trigger while a candidate is on offer, so
// photo B was uploaded, never assessed, and the poll re-rendered photo A.

check('a candidate profile has no start that reaches the picker', () => {
  // The invariant behind the whole fix, stated at the only place that decides
  // it: while the profile is `candidate` the setup may CONSENT, never register.
  // `offer_candidate` moves only `none → candidate`, so any other start would
  // upload a photo the server can never offer.
  assert.equal(avatarSetupStart(toAvatarProfile(candidateProfile())), 'consent_existing_candidate');
  const opened = review;
  assert.equal(opened.step, 'review');
  // `intro` — the only step that renders the album/camera pair — is unreachable
  // from a candidate profile except through a dismissal.
  for (const status of ['candidate', 'preparing', 'ready', 'refresh_recommended', 'disabled']) {
    const start = avatarSetupStart(toAvatarProfile(profile({ status })));
    assert.notEqual(initialAvatarSetupState(start, null).step, 'intro', status);
  }
  assert.equal(initialAvatarSetupState(avatarSetupStart(toAvatarProfile(profile())), null).step, 'intro');
});

check('choosing another photo goes through a dismissal, not a reset', () => {
  const reviewing = review;
  const dismissing = dismissSubmitted(reviewing);
  assert.equal(dismissing.step, 'dismissing');
  // The photo stays in state while its dismissal is in flight, so the screen can
  // keep showing what is being given up.
  assert.equal(dismissing.candidate?.sourceAssetId, review.candidate?.sourceAssetId);
  assert.equal(dismissing.problem, null);
});

check('once the dismissal lands, the intro is honest again', () => {
  const fresh = candidateDismissed();
  assert.deepEqual(fresh, intro);
  assert.equal(fresh.candidate, null);
  assert.equal(fresh.consentRecorded, false);
});

check('a failed dismissal says so and does NOT drop the user at the picker', () => {
  const reviewing = review;
  const failed = dismissFailed(dismissSubmitted(reviewing));
  assert.equal(failed.step, 'problem');
  assert.equal(failed.problem, 'dismiss_failed');
  // Keeping the candidate is what lets the retry re-target the same asset.
  assert.equal(failed.candidate?.sourceAssetId, review.candidate?.sourceAssetId);
});

check('the retry for a failed dismissal is the dismissal — never `pick`', () => {
  const failed = dismissFailed(
    dismissSubmitted(review),
  );
  // `pick` here would be the original bug wearing a retry label: the candidate
  // is still on offer, so the new photo would be suppressed and never surfaced.
  assert.equal(retryTarget(failed), 'dismiss');
});

check('the screen declines the DISPLAYED asset, and posts no consent version', () => {
  // §4.2 forbids `consent_version` on a decline (`4001`), and `buildConsentBody`
  // is what drops it — asserted in avatarCandidatePrompt.test.ts. What is
  // asserted here is that this screen decides against the candidate it is
  // showing rather than any other id.
  assert.match(
    SCREEN_SOURCE,
    /decideAvatarConsent\(candidate\.sourceAssetId,\s*false,/,
    'the dismissal must name the displayed candidate',
  );
  assert.match(
    SCREEN_SOURCE,
    /onPress=\{\(\) => void dismissCandidate\(\)\}/,
    'the "another photo" control must run the dismissal, not a local reset',
  );
});

check('a lost dismissal answer is settled by the PROFILE, not the status code', () => {
  // A decided asset answers 4091 forever and `toAvatarConsentErrorState` reads
  // that as non-retryable, so a code-only reading would dead-end on a dismissal
  // that already succeeded. The screen re-reads and compares the asset id.
  assert.match(SCREEN_SOURCE, /settleDismissalFromProfile/);
  assert.match(SCREEN_SOURCE, /profile\.candidate\?\.sourceAssetId === dismissedAssetId/);
});

check('a failed dismissal still offers BOTH moves the server allows', () => {
  // `settleDismissalFromProfile` only reaches `dismiss_failed` after confirming
  // the profile STILL offers that exact asset — i.e. the server would accept it.
  // Rendering a bare error plus a retry would withhold that acceptance, which is
  // the same shape of defect as the control this round exists to fix. So the
  // review block (photo + clauses + accept) renders on this problem too, and the
  // intro copy stands down so the three clause nativeIDs stay unique.
  assert.match(
    SCREEN_SOURCE,
    /const dismissalDidNotLand = step === 'problem' && state\?\.problem === 'dismiss_failed';/,
  );
  assert.match(SCREEN_SOURCE, /showReview =\s*\n?\s*step === 'review' \|\| step === 'submitting' \|\| step === 'dismissing' \|\| dismissalDidNotLand;/);
  assert.match(
    SCREEN_SOURCE,
    /const showIntroCopy = step === 'intro' \|\| \(step === 'problem' && !dismissalDidNotLand\);/,
  );
  // And no SECOND retry button beside it: the review block's own "another photo"
  // control IS the dismissal retry, the way `pick` is the album/camera pair.
  assert.equal(SCREEN_SOURCE.includes("recovery === 'dismiss'"), false);
});

check('every path that renders a candidate also claims the prompt for it', () => {
  // §7.3 is one prompt per candidate ACROSS surfaces, and the passive sheet
  // reads the same ledger. A path that put a candidate on screen without
  // writing it would let that sheet ask again about the photo this screen is
  // already asking about. Three paths render one: the opening read, the
  // detection poll, and the post-dismissal settlement.
  // The declaration reads `takeOwnershipOfCandidate = useCallback(`, so only
  // call sites match this.
  const claims = SCREEN_SOURCE.match(/takeOwnershipOfCandidate\(/g) ?? [];
  assert.equal(claims.length, 3, `expected 3 call sites, saw ${claims.length}`);
});

check('the picker is not tappable before the opening profile read answers', () => {
  // `pick()` bails on a null state; without this the bail is silent and the tap
  // is simply lost. The intro copy still renders from the first frame, so
  // acceptance 4 is untouched.
  assert.match(SCREEN_SOURCE, /const opening = enableV3Avatar && state === null;/);
  assert.match(SCREEN_SOURCE, /disabled=\{busy \|\| opening\}/);
});

check('a candidate with no preview URL says so instead of showing a bare title', () => {
  assert.match(SCREEN_SOURCE, /avatarSetup\.previewUnavailable/);
  assert.ok('avatarSetup.previewUnavailable' in zhCN);
  assert.ok('avatarSetup.previewUnavailable' in enUS);
});

check('the permanence of a dismissal is disclosed before the tap', () => {
  // "accept=false dismisses that candidate permanently" (§4.2) is a fact the
  // user has to be told BEFORE choosing, not discover afterwards.
  assert.match(SCREEN_SOURCE, /avatarSetup\.anotherHint/);
  assert.match(zhCN['avatarSetup.anotherHint'], /放弃/);
  assert.match(enUS['avatarSetup.anotherHint'], /for good|permanently/i);
});

// --- Copy: one consent version, one meaning -----------------------------------
console.log('copy');

check('the setup screen renders the §15 clauses from V3-014\'s OWN keys', () => {
  // The recorded `consent_version` names exactly `AVATAR_CONSENT_COPY_KEYS`. If
  // this screen introduced its own wording for the same authorization, one stored
  // version would stand for two different texts and the audit record would stop
  // meaning anything. So it must render these keys, not copies of them.
  for (const key of ['avatarConsent.purpose', 'avatarConsent.thirdParty', 'avatarConsent.control']) {
    assert.ok(AVATAR_CONSENT_COPY_KEYS.includes(key as never), `${key} must be part of the version`);
    assert.ok(SCREEN_SOURCE.includes(`t('${key}')`), `${key} must be rendered by the setup screen`);
  }
});

check('the version’s CLAUSE subset is exactly what both surfaces render verbatim', () => {
  // V3-015 made one `consent_version` cover two surfaces. The three §15 clauses
  // are identical on both (asserted above and in avatarCandidatePrompt.test.ts);
  // the chrome around them is not — this screen renders `avatarSetup.reviewTitle`
  // / `.another` where the sheet renders `avatarConsent.title` / `.decline`,
  // because "choose another photo" is a different action from "decline". The
  // subset makes that split explicit instead of leaving one version string to
  // silently stand for two different framings. Which of the two readings ships
  // is V3_SPEC §4.3's human copy decision, recorded in feature_list.json.
  assert.deepEqual(
    [...AVATAR_CONSENT_CLAUSE_KEYS],
    ['avatarConsent.purpose', 'avatarConsent.thirdParty', 'avatarConsent.control'],
  );
  for (const key of AVATAR_CONSENT_CLAUSE_KEYS) {
    assert.ok((AVATAR_CONSENT_COPY_KEYS as readonly string[]).includes(key), key);
    assert.ok(SCREEN_SOURCE.includes(`t('${key}')`), `${key} must be rendered here too`);
  }
  // The two keys the surfaces genuinely differ on — named, so a future edit that
  // unified them would have to change this line deliberately.
  for (const key of ['avatarConsent.title', 'avatarConsent.decline']) {
    assert.equal(
      SCREEN_SOURCE.includes(`t('${key}')`),
      false,
      `${key} is the sheet's chrome; this screen has its own`,
    );
  }
});

check('the setup screen defines no second wording for those clauses', () => {
  for (const key of ['avatarSetup.purpose', 'avatarSetup.thirdParty', 'avatarSetup.control']) {
    assert.equal(key in zhCN, false, `${key} would fork the consent copy`);
    assert.equal(key in enUS, false, `${key} would fork the consent copy`);
  }
});

check('every avatarSetup key exists in BOTH catalogues', () => {
  const zhKeys = Object.keys(zhCN).filter((k) => k.startsWith('avatarSetup.'));
  const enKeys = Object.keys(enUS).filter((k) => k.startsWith('avatarSetup.'));
  assert.ok(zhKeys.length >= 20, `expected the full setup copy block, got ${zhKeys.length}`);
  assert.deepEqual(zhKeys.sort(), enKeys.sort());
});

check('the entry copy exists in both catalogues', () => {
  for (const key of ['should_i_buy.preview.entry', 'should_i_buy.preview.entryHint']) {
    assert.ok(key in zhCN, key);
    assert.ok(key in enUS, key);
  }
});

check('acceptance 2 is stated in the copy, in both locales', () => {
  // "One photo is enough for P0; no measurements or turn video are required."
  assert.match(zhCN['avatarSetup.oneShotIsEnough'], /三围|体重/);
  assert.match(zhCN['avatarSetup.oneShotIsEnough'], /转身/);
  assert.match(enUS['avatarSetup.oneShotIsEnough'], /measurement/i);
  assert.match(enUS['avatarSetup.oneShotIsEnough'], /turnaround|turn video/i);
});

check('no setup copy asks for a body measurement of any kind', () => {
  // §15 forbids body inference and V3-015 acceptance 2 forbids requiring
  // measurements — so the words must not appear as a REQUEST anywhere in this
  // block. The only mentions allowed are the "not needed" line above.
  const asks = Object.entries(zhCN)
    .filter(([k]) => k.startsWith('avatarSetup.') && k !== 'avatarSetup.oneShotIsEnough')
    .filter(([, v]) => /三围|身高|体重|尺码|BMI/.test(v));
  assert.deepEqual(asks, []);
});

check('the setup screen renders no measurement input at all', () => {
  // Acceptance 2 structurally: §9.4 says "不出现参数表单", so the absence of a
  // text input in the tree is the check, not the copy.
  assert.equal(SCREEN_SOURCE.includes('TextInput'), false);
});

check('the screen never persists a signed preview URL', () => {
  // Contract §3: image URLs are short-lived and must not be stored. The only use
  // of `previewUrl` is as an <Image> source.
  const persisted = /(?:AsyncStorage|setItem|persist)\s*\(/.test(SCREEN_SOURCE);
  assert.equal(persisted, false);
});

console.log(`\navatarPhotoSetup: ${checks} checks passed`);
