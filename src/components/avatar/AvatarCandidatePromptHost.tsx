import { useCallback, useEffect, useRef, useState } from 'react';

import { getAvatarProfile, decideAvatarConsent } from '@/api/avatarProfile';
import { isPromptableCandidate, type AvatarCandidate } from '@/api/avatarProfileMapping';
import { AvatarCandidateSheet } from '@/components/avatar/AvatarCandidateSheet';
import { useV3EventContext } from '@/hooks/useV3EventContext';
import { AVATAR_CONSENT_COPY_VERSION } from '@/i18n/avatarConsentCopy';
import { enableV3Avatar } from '@/lib/featureFlags';
import { nextPollDelayMs } from '@/state/avatarCandidatePrompt';
import { useAvatarCandidatePromptStore } from '@/store/avatarCandidatePrompt';
import { trackV3 } from '@/utils/analytics';

/**
 * V3-014 — the controller behind the avatar candidate sheet. Mounted ONCE next
 * to `ToastHost`, outside the navigator.
 *
 * ## Why a bounded poll exists at all
 *
 * BE candidate detection is an async worker job (`enqueue_candidate_detection`
 * → `avatar_candidate_worker`, a segmentation pass measured in seconds), so the
 * source flow returns long before a candidate exists. A single GET on flow
 * completion would almost always read `status=none` and the feature would
 * silently never fire. The poll is short, fixed and silent: nothing renders
 * while it runs — no spinner and no "checking your photo…", either of which
 * §7.3 would read as a countdown.
 *
 * ## Why the host is app-level and not on the completing screen
 *
 * The import batch's last confirm NAVIGATES AWAY (`goNextOrExit` replaces the
 * route), so a poll owned by that screen would be cancelled by its own success.
 * The arm is therefore session state and the host outlives any one screen —
 * bounded instead by the poll window, which is what keeps the sheet tied to the
 * flow that armed it.
 *
 * ## Silence is correct for the unasked path, and only for it
 *
 * Every failure of the discovery GET — 503 with the flag off, 404, network,
 * timeout, window exhausted — disarms silently. The user did not ask for this
 * request; surfacing its failure moments after they saved an OOTD photo or
 * finished an import would read as *that* flow having failed, which is exactly
 * what acceptance 2 forbids. The user-initiated answer is the opposite case and
 * renders its failure in the sheet (see `answer`).
 */
export function AvatarCandidatePromptHost() {
  const armedAt = useAvatarCandidatePromptStore((s) => s.armedAt);
  const disarm = useAvatarCandidatePromptStore((s) => s.disarm);
  const markPrompted = useAvatarCandidatePromptStore((s) => s.markPrompted);
  const getEventContext = useV3EventContext();

  const [candidate, setCandidate] = useState<AvatarCandidate | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  // Guards the in-flight answer against a second tap arriving in the same frame
  // (`busy` only disables after a re-render) — the same synchronous-gate shape
  // ImportConfirmScreen uses for its double-confirm.
  const answeringRef = useRef(false);

  useEffect(() => {
    // The flag is read inside the effect as well as at the call sites so that
    // NOTHING — not one request — happens while the feature is off.
    if (!enableV3Avatar || armedAt == null) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const stop = () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };

    const poll = async (attempt: number) => {
      const delay = nextPollDelayMs(attempt);
      if (delay == null) {
        // Window spent without a candidate. Nothing is shown and nothing is
        // recorded: the next source flow may legitimately ask again, because
        // this one never put anything in front of the user.
        if (!cancelled) disarm();
        return;
      }
      timer = setTimeout(async () => {
        if (cancelled) return;
        let profile;
        try {
          profile = await getAvatarProfile();
        } catch {
          if (!cancelled) disarm();
          return;
        }
        if (cancelled) return;

        if (!isPromptableCandidate(profile) || !profile.candidate) {
          void poll(attempt + 1);
          return;
        }
        const found = profile.candidate;
        // §7.3: one prompt per candidate, forever. Recorded at SHOW time below,
        // so an answer lost to a crash or an offline decline cannot re-arm it.
        if (useAvatarCandidatePromptStore.getState().wasPrompted(found.sourceAssetId)) {
          disarm();
          return;
        }

        markPrompted(found.sourceAssetId);
        setFailed(false);
        setCandidate(found);
        disarm();

        const context = getEventContext();
        // `flow_id` is `when_in_flow` for this event and OOTD/import are not V3
        // decision flows, so a null id is the CORRECT envelope here — one is
        // never manufactured to fill the field.
        if (context && found.sourceType) {
          trackV3(
            'v3_avatar_prompt_shown',
            { source_type: found.sourceType, context: 'post_flow_sheet' },
            context,
          );
        }
      }, delay);
    };

    void poll(0);
    return stop;
  }, [armedAt, disarm, markPrompted, getEventContext]);

  const close = useCallback(() => {
    setCandidate(null);
    setBusy(false);
    setFailed(false);
    answeringRef.current = false;
  }, []);

  /**
   * The two answers differ deliberately, and the difference is the point.
   *
   * ACCEPT asks for something to happen. If the POST fails and the sheet closed
   * anyway, the user would believe they had set an appearance reference and
   * they would not have one — so the sheet stays open with an explicit retry.
   *
   * DECLINE asks for nothing to happen, and it happens locally the moment it is
   * tapped: the sheet closes and the ledger already guarantees this device will
   * never re-ask. Holding a consent sheet open to report that a *dismissal*
   * failed would degrade the flow the user was actually in, which acceptance 2
   * forbids. The POST is still sent (best-effort) because `accept=false` is
   * what makes the dismissal durable server-side; if it is lost, the candidate
   * stays consentable on the server and V3-015's on-demand path is where a user
   * who changes their mind picks it up.
   */
  const answer = useCallback(
    async (accept: boolean) => {
      if (!candidate || answeringRef.current) return;
      answeringRef.current = true;

      if (!accept) {
        close();
        try {
          await decideAvatarConsent(candidate.sourceAssetId, false, AVATAR_CONSENT_COPY_VERSION);
        } catch {
          // Deliberately swallowed — see the doc comment above.
        }
        return;
      }

      setBusy(true);
      setFailed(false);
      try {
        await decideAvatarConsent(candidate.sourceAssetId, true, AVATAR_CONSENT_COPY_VERSION);
        close();
      } catch {
        setBusy(false);
        setFailed(true);
        answeringRef.current = false;
      }
    },
    [candidate, close],
  );

  if (!enableV3Avatar || !candidate) return null;

  return (
    <AvatarCandidateSheet
      visible
      previewUrl={candidate.previewUrl}
      busy={busy}
      failed={failed}
      onAccept={() => void answer(true)}
      onDecline={() => void answer(false)}
    />
  );
}
