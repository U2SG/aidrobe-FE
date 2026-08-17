import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from 'react-native';

import {
  decideAvatarConsent,
  getAvatarProfile,
  registerAvatarUpload,
  startAvatarPreparation,
} from '@/api/avatarProfile';
import {
  avatarSetupStart,
  preparationConflictOutcome,
  toAvatarConsentErrorState,
  toAvatarPreparationFailure,
} from '@/api/avatarProfileMapping';
import type { HttpErrorLike } from '@/api/purchaseDecisionMapping';
import { adoptV3Flow, endV3Flow } from '@/api/v3Flow';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { SystemIcon } from '@/components/ui/SystemIcon';
import { useT, type UseT } from '@/hooks/useT';
import { useV3EventContext } from '@/hooks/useV3EventContext';
import type { I18nKey } from '@/i18n';
import { AVATAR_CONSENT_COPY_VERSION } from '@/i18n/avatarConsentCopy';
import { enableV3Avatar } from '@/lib/featureFlags';
import { useAvatarCandidatePromptStore } from '@/store/avatarCandidatePrompt';
import { colors, radius, shadow, spacing, type } from '@/theme/design';
import type { DiscoverStackParamList } from '@/types/navigation';
import { trackV3 } from '@/utils/analytics';
import { uploadLocalImage } from '@/utils/imageUpload';
import { pickPersonPhoto, type AvatarPhotoSource } from '@/utils/personPhotoPicker';
import {
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
  promptSourceType,
  registrationFailed,
  retryTarget,
  setupUnavailable,
  uploadFailed,
  type AvatarSetupProblem,
  type AvatarSetupState,
} from './avatarPhotoSetup';

type Props = NativeStackScreenProps<DiscoverStackParamList, 'AvatarPhotoSetup'>;

// V3-015 — on-demand full-body photo setup (V3_SPEC §5.5 / §7.1 source C / §9.4).
//
// One screen, reached only because the user asked to see an outfit on
// themselves. §9.4's requirements are all here and none of them is a form: a
// short framing hint, album/camera, the purpose stated BEFORE anything leaves
// the device, and the qualification result reported as it arrives. There is no
// measurement field anywhere in the tree, which makes acceptance 2 a property of
// the screen rather than a claim about it.
//
// The decision behind it never moves. This screen is PUSHED on the Discover
// stack, so `ShouldIBuyScreen` stays mounted with its decision in state and
// `goBack` lands on that same card — the V3-010 hand-off shape, reused because
// acceptance 1 ("the decision result remains usable when setup is skipped")
// should be a property of the navigation, not a promise in a comment.
//
// Every step decision lives in `avatarPhotoSetup.ts` (RN-free, Node-tested).
// What lives here is the four backend calls, the picker, and flow ownership.

const T = {
  bg: colors.groupedBackground,
  card: colors.elevated,
  cardSoft: colors.secondaryElevated,
  ink: colors.label,
  ink2: colors.secondaryLabel,
  ink3: colors.tertiaryLabel,
  divider: colors.separator,
};

const PREVIEW_W = 156;
const PREVIEW_H = 208;

/** Which copy each recoverable state renders. A total `Record` so a new problem
 *  cannot be added without giving the user something to read (§3.6 — no silent
 *  failure, ever). */
const PROBLEM_COPY: Record<AvatarSetupProblem, I18nKey> = {
  permission_denied: 'avatarSetup.problem.permission',
  upload_failed: 'avatarSetup.problem.upload',
  photo_unusable: 'avatarSetup.problem.photo',
  consent_failed: 'avatarSetup.problem.consent',
  dismiss_failed: 'avatarSetup.problem.dismiss',
  preparation_failed: 'avatarSetup.problem.preparation',
  unavailable: 'avatarSetup.problem.unavailable',
  revoked: 'avatarSetup.problem.revoked',
};

function PrimaryButton({
  label,
  onPress,
  busy,
  disabled,
}: {
  label: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled, busy: !!busy }}
      disabled={disabled}
      onPress={onPress}
      // Layout stays on the plain style object — on the RN new arch a style
      // FUNCTION's output is dropped on device, which would leave inverse ink on
      // a vanished background (repo CLAUDE.md).
      style={{
        minHeight: 48,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 14,
        borderRadius: radius.md,
        backgroundColor: colors.label,
        opacity: disabled ? 0.45 : 1,
      }}
    >
      <Text style={{ ...type.callout, fontWeight: '600', color: colors.inverse }}>{label}</Text>
    </Pressable>
  );
}

function SecondaryButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={{
        minHeight: 48,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 14,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: T.divider,
        backgroundColor: 'transparent',
        opacity: disabled ? 0.45 : 1,
      }}
    >
      <Text style={{ ...type.callout, fontWeight: '600', color: T.ink2 }}>{label}</Text>
    </Pressable>
  );
}

/** The §15 authorization clauses, rendered from the SAME keys as V3-014's sheet.
 *  `AVATAR_CONSENT_COPY_VERSION` names exactly those keys, so reusing them is
 *  what keeps one recorded version standing for one text; a re-worded clause here
 *  would quietly make every stored version ambiguous. */
function ConsentClauses({ t }: { t: UseT }) {
  return (
    <View style={{ gap: 10 }}>
      <Text nativeID="avatar-setup-purpose" style={{ ...type.body, color: T.ink2, lineHeight: 21 }}>
        {t.t('avatarConsent.purpose')}
      </Text>
      <Text
        nativeID="avatar-setup-third-party"
        style={{ ...type.footnote, color: T.ink2, lineHeight: 19 }}
      >
        {t.t('avatarConsent.thirdParty')}
      </Text>
      <Text
        nativeID="avatar-setup-control"
        style={{ ...type.footnote, color: T.ink3, lineHeight: 19 }}
      >
        {t.t('avatarConsent.control')}
      </Text>
    </View>
  );
}

/** A working state with a status line — §9.5's calm progress: no countdown, no
 *  percentage we cannot keep. The photo is beside it so the line refers to
 *  something the user can see. */
function WorkingBlock({ label, uri, alt }: { label: string; uri: string | null; alt: string }) {
  return (
    <View style={{ gap: 14, alignItems: 'center' }}>
      {uri ? (
        <Image
          accessibilityLabel={alt}
          source={{ uri }}
          style={{
            width: PREVIEW_W,
            height: PREVIEW_H,
            borderRadius: radius.md,
            backgroundColor: T.cardSoft,
          }}
          resizeMode="cover"
        />
      ) : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <ActivityIndicator color={colors.accent} />
        <Text
          nativeID="avatar-setup-status"
          accessibilityRole="alert"
          style={{ ...type.footnote, color: T.ink2 }}
        >
          {label}
        </Text>
      </View>
    </View>
  );
}

export function AvatarPhotoSetupScreen({ navigation, route }: Props) {
  const t = useT();
  const getEventContext = useV3EventContext();
  const markPrompted = useAvatarCandidatePromptStore((s) => s.markPrompted);
  const disarmPassivePrompt = useAvatarCandidatePromptStore((s) => s.disarm);

  const [state, setState] = useState<AvatarSetupState | null>(null);
  const openedRef = useRef(false);
  const promptEmittedRef = useRef(false);
  // Guards a second tap arriving in the same frame, before `step` re-renders the
  // buttons into their disabled state (the `ImportConfirmScreen` /
  // `AvatarCandidatePromptHost` shape).
  const workingRef = useRef(false);

  /**
   * The current step, readable synchronously.
   *
   * Not a convenience: this flow is a chain of awaits, so each step has to know
   * what the previous one produced, and `setState(fn)` cannot answer that.
   * React may execute a functional updater during the later render rather than at
   * dispatch (it only computes eagerly when the queue happens to be empty), so
   * anything read straight after a `setState(fn)` is timing-dependent. The
   * detection poll did exactly that and stopped after ONE attempt instead of ten:
   * it decided whether to keep polling from a variable the updater had not
   * assigned yet, leaving the user watching "checking this photo…" forever. Found
   * by the evidence driver, not by reading the code.
   *
   * So every transition goes through `apply`, which writes the ref and the state
   * together, and every reader uses `stateRef.current`.
   */
  const stateRef = useRef<AvatarSetupState | null>(null);
  const apply = useCallback((next: AvatarSetupState) => {
    stateRef.current = next;
    setState(next);
    return next;
  }, []);

  /**
   * The flow this setup belongs to.
   *
   * `ShouldIBuyScreen` closes its flow on blur, so by the time this screen is up
   * no flow is active and `v3_avatar_prompt_shown` would emit without a
   * `flow_id` — permitted by the contract's `when_in_flow` rule, but
   * `consent_prompt_completion_delta` (kill criterion 4) cannot be computed
   * without it. Adopting the id also stamps `X-Correlation-Id` onto the calls
   * below, so the BE-emitted `v3_avatar_consent` joins the same flow.
   *
   * Adopted inside the FOCUS effect, and the opening profile read is kicked off
   * from the same callback, so the ordering is guaranteed rather than incidental.
   * Ended on blur for the reason V3-009 ends it there: a live flow would
   * otherwise stamp another tab's unrelated requests.
   */
  const takeOwnershipOfCandidate = useCallback(
    /**
     * This screen is now the one asking about this candidate.
     *
     * `AvatarCandidatePromptHost` is mounted app-wide and polls whenever a source
     * flow armed it, so a user who finished an import and then walked in here
     * could be asked twice about one photo — once by this screen, once by a sheet
     * over it. Writing the SAME ledger the host reads (rather than a second one)
     * keeps §7.3's one-prompt-per-candidate true across both surfaces, and
     * disarming closes a window that is now redundant.
     */
    (sourceAssetId: string) => {
      markPrompted(sourceAssetId);
      disarmPassivePrompt();
    },
    [markPrompted, disarmPassivePrompt],
  );

  /**
   * Re-assert this attempt's flow, immediately before something that must carry
   * it.
   *
   * Adopting once on focus is NOT enough, and this is the bug the driver caught:
   * React Navigation does not guarantee that the blurring screen's cleanup runs
   * before the focusing screen's effect, so `ShouldIBuyScreen`'s `endV3Flow` can
   * land AFTER this screen adopted — clearing the id and leaving the prompt event
   * and the consent POST with no `flow_id` at all. That is silent: the event is
   * `when_in_flow`, so it validates fine and simply cannot be joined, and
   * `consent_prompt_completion_delta` (kill criterion 4) becomes uncomputable
   * without anything looking broken.
   *
   * Re-asserting is idempotent — it is the same id from the same nav param — so
   * ordering stops mattering instead of being relied upon.
   */
  const ensureFlow = useCallback(() => {
    const flowId = route.params?.flowId;
    if (flowId) adoptV3Flow(flowId);
  }, [route.params?.flowId]);

  const emitPromptShown = useCallback(
    (sourceType: ReturnType<typeof promptSourceType>) => {
      if (promptEmittedRef.current || !sourceType) return;
      const context = getEventContext();
      if (!context) return;
      promptEmittedRef.current = true;
      // `preview_request` is the §7.3 case where re-explaining is allowed: the
      // user asked for a visual. V3-014's sheet owns the other context.
      trackV3(
        'v3_avatar_prompt_shown',
        { source_type: sourceType, context: 'preview_request' },
        context,
      );
    },
    [getEventContext],
  );

  // The opening read. One GET, silent: everything on this surface is optional, so
  // a failure renders the unavailable state with a way back rather than a toast
  // over a decision that is still perfectly good (contract §2 rollback rule 2).
  const open = useCallback(async () => {
    ensureFlow();
    try {
      const profile = await getAvatarProfile();
      const start = avatarSetupStart(profile);
      const next = apply(initialAvatarSetupState(start, profile.candidate));
      if (next.candidate) takeOwnershipOfCandidate(next.candidate.sourceAssetId);
      // Re-asserted after the await too: the transition's cleanup may have run
      // while this request was in flight, and the emit below is the one this
      // feature owns.
      ensureFlow();
      emitPromptShown(promptSourceType(start, profile.candidate));
    } catch {
      apply(setupUnavailable(stateRef.current ?? initialAvatarSetupState('new_photo', null)));
    }
  }, [apply, emitPromptShown, ensureFlow, takeOwnershipOfCandidate]);

  useFocusEffect(
    useCallback(() => {
      ensureFlow();
      if (enableV3Avatar && !openedRef.current) {
        openedRef.current = true;
        void open();
      }
      return endV3Flow;
    }, [ensureFlow, open]),
  );

  const runDetectionPoll = useCallback(
    async (attempt: number) => {
      const delay = nextSetupPollDelayMs(attempt);
      // Unreachable: the loop stops as soon as the machine leaves `detecting`,
      // which it does on the attempt that spends the window.
      if (delay === null) return;
      await new Promise((resolve) => setTimeout(resolve, delay));
      // The user may have left, chosen another photo, or hit the way back while
      // this slept; only a screen still waiting may act on the answer.
      if (stateRef.current?.step !== 'detecting') return;

      let candidate = null;
      try {
        const profile = await getAvatarProfile();
        // Only a profile actually OFFERING material counts. A read that fails is
        // treated as "nothing yet": it is indistinguishable from one, and both
        // end at the same honest message when the window is spent.
        candidate =
          avatarSetupStart(profile) === 'consent_existing_candidate' ? profile.candidate : null;
      } catch {
        candidate = null;
      }
      if (candidate) takeOwnershipOfCandidate(candidate.sourceAssetId);

      const current = stateRef.current;
      if (!current || current.step !== 'detecting') return;
      const next = apply(detectionPolled(current, candidate));
      if (next.step === 'detecting') void runDetectionPoll(next.pollAttempt);
    },
    [apply, takeOwnershipOfCandidate],
  );

  /** Upload the already-picked photo and hand it to detection. Separate from the
   *  pick so a failed upload retries without re-picking. */
  const uploadAndRegister = useCallback(
    async (uri: string) => {
      ensureFlow();
      const before = stateRef.current;
      if (!before) return;
      let objectKey: string;
      try {
        const uploaded = await uploadLocalImage(uri, 'v3-avatar');
        objectKey = uploaded.objectKey;
      } catch {
        apply(uploadFailed(stateRef.current ?? before));
        workingRef.current = false;
        return;
      }
      try {
        // The DURABLE reference only — never the TTL-bound file URL.
        const registration = await registerAvatarUpload(objectKey);
        const next = apply(photoRegistered(stateRef.current ?? before, registration.disposition));
        workingRef.current = false;
        if (next.step === 'detecting') void runDetectionPoll(0);
      } catch (error) {
        const failure = toAvatarConsentErrorState(error as HttpErrorLike);
        apply(registrationFailed(stateRef.current ?? before, failure.retryable));
        workingRef.current = false;
      }
    },
    [apply, ensureFlow, runDetectionPoll],
  );

  const pick = useCallback(
    async (source: AvatarPhotoSource) => {
      if (workingRef.current) return;
      const current = stateRef.current;
      if (!current) return;
      workingRef.current = true;
      const picked = await pickPersonPhoto(source);
      if (picked.kind === 'permission_denied') {
        apply(photoPickDenied(current, source));
        workingRef.current = false;
        return;
      }
      if (picked.kind === 'cancelled') {
        // Nothing sent, nothing said, nothing lost: the screen is exactly as it
        // was and can be used again immediately (acceptance 3).
        apply(photoPickCancelled(current));
        workingRef.current = false;
        return;
      }
      apply(photoPicked(current, source, picked.uri));
      await uploadAndRegister(picked.uri);
    },
    [apply, uploadAndRegister],
  );

  /** Start the preparation that consent alone does not enqueue. A 409 cannot be
   *  read as "already running" from the frozen envelope, so the profile is
   *  re-read and its status decides what the user is told. */
  const prepare = useCallback(async () => {
    ensureFlow();
    const before = stateRef.current;
    if (!before) return;
    try {
      const preparation = await startAvatarPreparation();
      apply(preparationSettled(stateRef.current ?? before, preparation.status));
    } catch (error) {
      const failure = toAvatarPreparationFailure(error as HttpErrorLike);
      if (failure !== 'conflict') {
        apply(preparationFailed(stateRef.current ?? before, failure));
        return;
      }
      try {
        const profile = await getAvatarProfile();
        const outcome = preparationConflictOutcome(profile);
        apply(
          preparationSettled(
            stateRef.current ?? before,
            outcome === 'unresolved' ? 'unresolved' : profile.status,
          ),
        );
      } catch {
        apply(preparationFailed(stateRef.current ?? before, 'retryable'));
      }
    } finally {
      workingRef.current = false;
    }
  }, [apply, ensureFlow]);

  /** The explicit authorization. It posts against the asset whose own photo is on
   *  screen, which is the whole reason `review` is a step of its own. */
  const consentAndPrepare = useCallback(async () => {
    if (workingRef.current) return;
    const current = stateRef.current;
    const candidate = current?.candidate;
    if (!current || !candidate) return;
    workingRef.current = true;
    ensureFlow();
    apply(consentSubmitted(current));

    if (!current.consentRecorded) {
      try {
        await decideAvatarConsent(candidate.sourceAssetId, true, AVATAR_CONSENT_COPY_VERSION);
        apply(consentRecorded(stateRef.current ?? current));
      } catch (error) {
        const failure = toAvatarConsentErrorState(error as HttpErrorLike);
        apply(consentFailed(stateRef.current ?? current, failure.retryable));
        workingRef.current = false;
        return;
      }
    }
    await prepare();
  }, [apply, ensureFlow, prepare]);

  /**
   * A dismissal whose request failed — settled by re-reading the profile.
   *
   * The status code cannot answer this on its own: a decided asset answers
   * `4091` forever, which `toAvatarConsentErrorState` reads as non-retryable, so
   * a dismissal that landed with only its answer lost would dead-end on a retry
   * button guaranteed to fail. What the profile says now is the fact:
   *
   * - still offering the SAME asset → the dismissal really did not land, so say
   *   so and keep the retry pointed at it;
   * - offering nothing, or something else → the answer is on file after all, and
   *   the normal opening rule renders the truth (intro for `none`, review for a
   *   different candidate, terminal for a profile that moved on).
   */
  const settleDismissalFromProfile = useCallback(
    async (dismissedAssetId: string, fallback: AvatarSetupState) => {
      try {
        const profile = await getAvatarProfile();
        if (profile.candidate?.sourceAssetId === dismissedAssetId) {
          apply(dismissFailed(fallback));
          return;
        }
        const next = apply(initialAvatarSetupState(avatarSetupStart(profile), profile.candidate));
        // Every path that puts a candidate on screen owns the prompt for it —
        // otherwise the passive sheet could later ask about the very photo this
        // screen is already asking about (§7.3, one prompt per candidate).
        if (next.candidate) takeOwnershipOfCandidate(next.candidate.sourceAssetId);
      } catch {
        apply(dismissFailed(fallback));
      }
    },
    [apply, takeOwnershipOfCandidate],
  );

  /**
   * "Choose another photo" — the dismissal the backend requires, then the intro.
   *
   * Not a local reset: while the profile is `candidate` the worker suppresses
   * every new photo (`CANDIDATE_ALREADY_OFFERED`), so resetting alone would
   * upload a full-body photo that can never be offered and then re-render the
   * ORIGINAL candidate. See `dismissSubmitted` for the whole chain.
   */
  const dismissCandidate = useCallback(async () => {
    if (workingRef.current) return;
    const current = stateRef.current;
    const candidate = current?.candidate;
    if (!current || !candidate) return;
    workingRef.current = true;
    ensureFlow();
    apply(dismissSubmitted(current));
    try {
      // `buildConsentBody` drops the copy version on a decline — §4.2 forbids it
      // there and the router answers `4001` to the wrong shape.
      await decideAvatarConsent(candidate.sourceAssetId, false, AVATAR_CONSENT_COPY_VERSION);
      apply(candidateDismissed());
    } catch {
      await settleDismissalFromProfile(candidate.sourceAssetId, stateRef.current ?? current);
    } finally {
      workingRef.current = false;
    }
  }, [apply, ensureFlow, settleDismissalFromProfile]);

  const retry = useCallback(() => {
    const current = stateRef.current;
    if (!current) return;
    const target = retryTarget(current);
    // `dismiss` is deliberately absent: that recovery is the review block's own
    // "换一张照片" button, the same way `pick` is the album/camera pair.
    if (target === 'upload' && current.pickedUri) {
      if (workingRef.current) return;
      workingRef.current = true;
      apply(photoPicked(current, current.source ?? 'album', current.pickedUri));
      void uploadAndRegister(current.pickedUri);
      return;
    }
    if (target === 'consent' || target === 'prepare') void consentAndPrepare();
  }, [apply, uploadAndRegister, consentAndPrepare]);

  const leave = useCallback(() => navigation.goBack(), [navigation]);

  const step = state?.step ?? 'intro';
  const busy =
    step === 'uploading' || step === 'detecting' || step === 'submitting' || step === 'dismissing';
  // The opening profile read has not answered yet. The intro copy renders from
  // the first frame either way (acceptance 4 — the purpose is stated before any
  // picker can open), but the picker itself must NOT look usable: `pick()` needs
  // that profile, and without this a tap in the window between the first frame
  // and the response was swallowed with no feedback at all.
  const opening = enableV3Avatar && state === null;
  const recovery = state ? retryTarget(state) : null;
  // A `pick` recovery IS the album/camera pair below, so no separate retry button
  // is rendered for it — two buttons that do the same thing would read as two
  // different offers.
  const showRetryButton = recovery === 'upload' || recovery === 'consent' || recovery === 'prepare';
  const showPickActions = step === 'intro' || (step === 'problem' && recovery === 'pick');
  /**
   * A dismissal that did not land leaves the candidate ON OFFER — that is what
   * `settleDismissalFromProfile` just confirmed by re-reading the profile. So
   * BOTH server-legal moves must stay on screen: accept this photo, or try the
   * dismissal again. Dropping to a bare error + retry would withhold the one
   * action the backend still permits, which is the same shape of defect as the
   * control this round exists to fix.
   *
   * The review block IS the recovery here — its "换一张照片" button is the
   * `dismiss` retry — so no separate retry button is rendered, exactly as a
   * `pick` recovery is the album/camera pair below rather than a third button.
   */
  const dismissalDidNotLand = step === 'problem' && state?.problem === 'dismiss_failed';
  const showReview =
    step === 'review' || step === 'submitting' || step === 'dismissing' || dismissalDidNotLand;
  // …and then the intro copy must stand down, or its `ConsentClauses` would
  // render a second copy of the same three `nativeID`s.
  const showIntroCopy = step === 'intro' || (step === 'problem' && !dismissalDidNotLand);
  const leaveKey: I18nKey =
    step === 'preparing' || step === 'ready' ? 'avatarSetup.back' : 'avatarSetup.notNow';

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <ScreenHeader title={t.t('avatarSetup.title')} onBack={leave} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: spacing.screen, paddingBottom: 96, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            backgroundColor: T.card,
            borderRadius: radius.xl,
            padding: 16,
            gap: 16,
            ...shadow.soft,
          }}
        >
          {/* With the flag off this screen is unreachable (the entry that pushes
              it is gated too). The guard means a skewed deep link degrades to a
              statement and a way back, not to a half-rendered consent surface. */}
          {!enableV3Avatar ? (
            <Text style={{ ...type.body, color: T.ink2, lineHeight: 21 }}>
              {t.t('avatarSetup.problem.unavailable')}
            </Text>
          ) : (
            <>
              {/* §5.5's explanation and §15's clauses are on screen from the
                  first frame — before any picker, so the purpose is stated
                  before an upload can happen (acceptance 4) rather than beside a
                  photo that has already left the device. */}
              {showIntroCopy ? (
                <>
                  <Text
                    nativeID="avatar-setup-lead"
                    style={{ ...type.title2, color: T.ink, lineHeight: 30 }}
                  >
                    {t.t('avatarSetup.lead')}
                  </Text>
                  <ConsentClauses t={t} />
                  <View style={{ gap: 6 }}>
                    <Text style={{ ...type.footnote, color: T.ink3, lineHeight: 19 }}>
                      {t.t('avatarSetup.poseHint')}
                    </Text>
                    {/* Acceptance 2 in the copy as well as in the absence of any
                        field: no measurements, no weight, no turnaround video. */}
                    <Text
                      nativeID="avatar-setup-one-shot"
                      style={{ ...type.footnote, color: T.ink3, lineHeight: 19 }}
                    >
                      {t.t('avatarSetup.oneShotIsEnough')}
                    </Text>
                  </View>
                </>
              ) : null}

              {step === 'uploading' || step === 'detecting' ? (
                <WorkingBlock
                  label={t.t(step === 'uploading' ? 'avatarSetup.uploading' : 'avatarSetup.detecting')}
                  uri={state?.pickedUri ?? null}
                  alt={t.t('avatarSetup.pickedAlt')}
                />
              ) : null}

              {showReview ? (
                <View style={{ gap: 14 }}>
                  <Text
                    nativeID="avatar-setup-review-title"
                    accessibilityRole="header"
                    style={{ ...type.headline, color: T.ink, lineHeight: 24 }}
                  >
                    {t.t('avatarSetup.reviewTitle')}
                  </Text>
                  {/* The SERVER's own preview of the asset this consent will
                      name. The locally picked file is deliberately not used as a
                      stand-in: the frozen shapes cannot correlate an object key
                      to a candidate id, so showing the local photo would claim
                      they are the same asset without being able to prove it. No
                      preview ⇒ no image, the choice V3-014's sheet makes. */}
                  {state?.candidate?.previewUrl ? (
                    <Image
                      accessibilityLabel={t.t('avatarConsent.previewAlt')}
                      source={{ uri: state.candidate.previewUrl }}
                      style={{
                        alignSelf: 'center',
                        width: PREVIEW_W,
                        height: PREVIEW_H,
                        borderRadius: radius.md,
                        backgroundColor: T.cardSoft,
                      }}
                      resizeMode="cover"
                    />
                  ) : (
                    // `preview_url` is nullable in the frozen shape, so "the
                    // photo shown is the photo authorized" can degrade to "no
                    // photo shown". Said out loud rather than left as a title
                    // pointing at nothing — the consent is still against a named
                    // asset, and the user is told which fact is missing.
                    <Text
                      nativeID="avatar-setup-preview-missing"
                      style={{ ...type.footnote, color: T.ink3, textAlign: 'center', lineHeight: 19 }}
                    >
                      {t.t('avatarSetup.previewUnavailable')}
                    </Text>
                  )}
                  <ConsentClauses t={t} />
                </View>
              ) : null}

              {step === 'preparing' || step === 'ready' ? (
                <View style={{ gap: 8 }}>
                  <Text
                    nativeID="avatar-setup-outcome"
                    accessibilityRole="header"
                    style={{ ...type.headline, color: T.ink, lineHeight: 24 }}
                  >
                    {t.t(
                      step === 'ready' ? 'avatarSetup.readyTitle' : 'avatarSetup.preparingTitle',
                    )}
                  </Text>
                  <Text style={{ ...type.body, color: T.ink2, lineHeight: 21 }}>
                    {t.t(step === 'ready' ? 'avatarSetup.readyBody' : 'avatarSetup.preparingBody')}
                  </Text>
                </View>
              ) : null}

              {/* Every recoverable state says what happened and offers the action
                  that can actually fix it — never a generic retry guaranteed to
                  fail (see `retryTarget`). */}
              {step === 'problem' && state?.problem ? (
                <View
                  style={{
                    gap: 10,
                    borderRadius: radius.md,
                    backgroundColor: colors.warningBg,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <SystemIcon
                      name="exclamation"
                      size={16}
                      color={colors.cautionAmber}
                      strokeWidth={1.9}
                    />
                    <Text
                      nativeID="avatar-setup-problem"
                      accessibilityRole="alert"
                      style={{ ...type.footnote, color: T.ink2, flex: 1, lineHeight: 19 }}
                    >
                      {t.t(PROBLEM_COPY[state.problem])}
                    </Text>
                  </View>
                  {showRetryButton ? (
                    <SecondaryButton label={t.t('avatarConsent.retry')} onPress={retry} />
                  ) : null}
                </View>
              ) : null}

              {showPickActions ? (
                <View style={{ gap: 10 }}>
                  <PrimaryButton
                    label={t.t('avatarSetup.album')}
                    onPress={() => void pick('album')}
                    busy={opening}
                    disabled={busy || opening}
                  />
                  <SecondaryButton
                    label={t.t('avatarSetup.camera')}
                    onPress={() => void pick('camera')}
                    disabled={busy || opening}
                  />
                  {opening ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <ActivityIndicator color={colors.accent} />
                      <Text
                        nativeID="avatar-setup-opening"
                        accessibilityRole="alert"
                        style={{ ...type.footnote, color: T.ink3 }}
                      >
                        {t.t('avatarSetup.opening')}
                      </Text>
                    </View>
                  ) : null}
                </View>
              ) : null}

              {showReview ? (
                <View style={{ gap: 10 }}>
                  <PrimaryButton
                    label={t.t(step === 'submitting' ? 'avatarSetup.submitting' : 'avatarConsent.accept')}
                    onPress={() => void consentAndPrepare()}
                    busy={busy}
                    disabled={busy}
                  />
                  <SecondaryButton
                    label={t.t(step === 'dismissing' ? 'avatarSetup.dismissing' : 'avatarSetup.another')}
                    onPress={() => void dismissCandidate()}
                    disabled={busy}
                  />
                  {/* The permanence is disclosed BEFORE the tap, not discovered
                      after it: `accept=false` dismisses this candidate for good
                      (§4.2), and that is the price of being able to offer a
                      different photo at all. */}
                  <Text
                    nativeID="avatar-setup-another-hint"
                    style={{ ...type.caption, color: T.ink3, lineHeight: 17 }}
                  >
                    {t.t('avatarSetup.anotherHint')}
                  </Text>
                </View>
              ) : null}
            </>
          )}

          {/* The way back is present in EVERY state, including while work is in
              flight: the decision this came from is complete and waiting, and
              leaving must never be blocked by our own progress (acceptance 1). */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.t(leaveKey)}
            onPress={leave}
            style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ ...type.callout, color: T.ink3 }}>{t.t(leaveKey)}</Text>
          </Pressable>

          {enableV3Avatar && showIntroCopy ? (
            <Text
              nativeID="avatar-setup-keep-decision"
              style={{ ...type.caption, color: T.ink3, textAlign: 'center', lineHeight: 17 }}
            >
              {t.t('avatarSetup.keepDecision')}
            </Text>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}
