import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { getAvatarProfile } from '@/api/avatarProfile';
import {
  avatarSetupStart,
  type AvatarSetupStart,
  type AvatarStatus,
} from '@/api/avatarProfileMapping';
import { getOutfitVisualAsset } from '@/api/outfitVisual';
import {
  FEEDBACK_OPEN,
  PREVIEW_BOUNDARY_FALLBACK_KEY,
  PREVIEW_FEEDBACK_VERDICTS,
  previewFeedbackAllowed,
  previewFeedbackLabelKey,
  previewFeedbackSent,
  type PreviewFeedbackState,
  type PreviewFeedbackVerdict,
} from '@/api/previewFeedbackMapping';
import { requestVisualPreview, sendVisualPreviewFeedback } from '@/api/visualPreview';
import {
  DEFAULT_PREVIEW_CONCERN,
  IDLE,
  PREVIEW_POLL_INTERVAL_MS,
  REQUESTING,
  previewGenerateEntryVisible,
  previewPollErrored,
  previewPolled,
  previewRequestAllowed,
  previewRequested,
  previewUnavailableCaptionKey,
  previewViewedResult,
  toPreviewUnavailableReason,
  type PreviewHttpErrorLike,
  type PreviewPhase,
} from '@/api/visualPreviewMapping';
import type {
  DecisionEndpointContext,
  DecisionErrorState,
  HttpErrorLike,
  PurchaseCandidate,
  WardrobeDecision,
} from '@/api/purchaseDecisionMapping';
import { toDecisionErrorState } from '@/api/purchaseDecisionMapping';
import {
  createPurchaseCandidate,
  decidePurchaseCandidate,
  getPurchaseCandidate,
} from '@/api/purchaseDecisions';
import { adoptV3Flow, beginV3Flow, endV3Flow } from '@/api/v3Flow';
import { enableV3Avatar, enableV3StaticTryon } from '@/lib/featureFlags';
import { previewSetupEntryVisible } from '@/screens/avatar/avatarPhotoSetup';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { ImageThumb } from '@/components/ui/ImageThumb';
import { SystemIcon } from '@/components/ui/SystemIcon';
import { useT, type UseT } from '@/hooks/useT';
import type { I18nKey } from '@/i18n';
import { useV3EventContext } from '@/hooks/useV3EventContext';
import { colors, radius, shadow, spacing, type } from '@/theme/design';
import type { V3EventPayloads } from '@/utils/v3AnalyticsEvents';
import { trackV3 } from '@/utils/analytics';
import type { V3FeOwnedEvent } from '@/utils/v3AnalyticsEvents';
import type { DiscoverStackParamList } from '@/types/navigation';
import { pickAndUploadImage, uploadErrorMessage } from '@/utils/imageUpload';
import { useToastStore } from '@/store/toast';
import {
  ACTION_LABEL_KEYS,
  buildDecisionCard,
  candidateSummary,
  errorView,
  RELATION_LABEL_KEYS,
  sourceTypeForInput,
  uncertaintyCaveatKey,
  viewedEventDecision,
  type DecisionTone,
  type RenderedAction,
} from './shouldIBuyDecision';

type Props = NativeStackScreenProps<DiscoverStackParamList, 'ShouldIBuy'>;

// V3-009 — the Should-I-Buy decision card (V3_SPEC §5.4 / §9.2).
//
// The whole point of this screen is that it is COMPLETE with no avatar and no
// visual provider: §5.4's conditional preview layer is absent from the tree, so
// there is nothing to degrade, nothing to fail and no empty slot. Layers 1, 2,
// 3, 5 and 6 carry the full decision value on their own (§5.5 "Avatar None:
// give the complete purchase judgment first, do not leave the feature
// crippled"). V3-014/V3-019 add the preview layer above this one later.
//
// No decision logic lives here either: `decision_text`, `reasons[].text`,
// `summary_text` and `boundary_note` are server-rendered per-locale copy frozen
// into the snapshot (contract §5.3). Everything this file reads goes through
// `purchaseDecisionMapping` so the version-skew rules apply (V3-008 risk 1).

const T = {
  bg: colors.groupedBackground,
  card: colors.elevated,
  cardSoft: colors.secondaryElevated,
  ink: colors.label,
  ink2: colors.secondaryLabel,
  ink3: colors.tertiaryLabel,
  accent: colors.accent,
  divider: colors.separator,
};

/** Calm tone per §9.1: a warm surface tint plus ink, no gauge, no score, no
 * traffic-light saturation. `null` (unknown decision) keeps neutral chrome. */
const TONE_STYLE: Record<DecisionTone, { fg: string; bg: string }> = {
  positive: { fg: colors.success, bg: colors.successBg },
  caution: { fg: colors.cautionAmber, bg: colors.warningBg },
  negative: { fg: colors.danger, bg: colors.dangerBg },
  neutral: { fg: colors.secondaryLabel, bg: colors.fill },
};

const THUMB = 64;

// Bounded wait for a `submitted` (async-parsing) candidate to settle before
// requesting a decision — zero iterations while P0 parsing is synchronous.
const MAX_PARSE_POLLS = 5;
const PARSE_POLL_MS = 1200;

/** The candidate is kept beside the decision so §9.2's product header can show
 * the parsed attributes — the decision response carries none of them. */
interface DecisionResult {
  candidate: PurchaseCandidate;
  decision: WardrobeDecision;
}

function toneStyle(tone: DecisionTone | null) {
  return tone ? TONE_STYLE[tone] : { fg: T.ink, bg: T.cardSoft };
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ ...type.caption, color: T.ink3 }}>{title}</Text>
      {children}
    </View>
  );
}

/** §5.4 layer 1 + the uncertainty caveat. This block holds the page's only
 * emphasis (feature acceptance 2) — every other layer is body/footnote sized. */
function Judgment({ decision, t }: { decision: WardrobeDecision; t: UseT }) {
  const card = buildDecisionCard(decision);
  const { fg, bg } = toneStyle(card.emphasis.tone);
  const caveatKey = uncertaintyCaveatKey(decision.uncertainty);
  return (
    <View style={{ gap: 8 }}>
      <View style={{ backgroundColor: bg, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12 }}>
        <Text style={{ ...type.title2, color: fg, lineHeight: 30 }}>{card.emphasis.text}</Text>
      </View>
      {caveatKey ? (
        <Text style={{ ...type.caption, color: T.ink3, lineHeight: 16 }}>{t.t(caveatKey)}</Text>
      ) : null}
    </View>
  );
}

/** §5.4 layer 3. The comparison is where the existing-item alternative becomes
 * visible: `covers` items are the owned things that already do this job, and
 * V3-010's reuse action styles an outfit around the first of them. */
function ClosetComparison({
  comparison,
  t,
}: {
  comparison: NonNullable<ReturnType<typeof buildDecisionCard>['comparison']>;
  t: UseT;
}) {
  return (
    <Section title={t.t('should_i_buy.section.comparison')}>
      {comparison.summaryText ? (
        <Text style={{ ...type.body, color: T.ink2, lineHeight: 22 }}>{comparison.summaryText}</Text>
      ) : null}
      {comparison.items.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
          {comparison.items.map((item) => {
            // A skewed unknown relation renders no tag rather than a guess.
            const relationLabel = item.relation ? t.t(RELATION_LABEL_KEYS[item.relation]) : '';
            const label = relationLabel || t.t('should_i_buy.candidate.fallbackName');
            return (
              <View key={item.itemId} style={{ width: THUMB }}>
                {/* No `fallbackLabel`: the relation already reads underneath,
                    and printing it inside the placeholder too would say the
                    same word twice in one 64px column. */}
                <ImageThumb
                  uri={item.imageUrl}
                  size={THUMB}
                  cornerRadius={radius.sm}
                  accessibilityLabel={label}
                />
                {relationLabel ? (
                  <Text style={{ ...type.caption, color: T.ink3, marginTop: 6 }} numberOfLines={1}>
                    {relationLabel}
                  </Text>
                ) : null}
              </View>
            );
          })}
        </ScrollView>
      ) : null}
    </Section>
  );
}

/** §5.4 layer 6 — the frozen four, filtered upstream to the ones that lead
 * somewhere real. Only `add_to_candidates` is filled: the page must not make
 * buying look like the default, and two emphasized buttons would (§5.1). */
function NextActions({
  actions,
  chosen,
  onChoose,
  t,
}: {
  actions: RenderedAction[];
  chosen: RenderedAction | null;
  onChoose: (action: RenderedAction) => void;
  t: UseT;
}) {
  if (actions.length === 0) return null;
  return (
    <View style={{ gap: 10, borderTopWidth: 1, borderTopColor: T.divider, paddingTop: 14 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {actions.map((action) => {
          const isChosen = chosen === action;
          const isPrimary = action === 'add_to_candidates';
          return (
            <Pressable
              key={action}
              onPress={() => onChoose(action)}
              accessibilityRole="button"
              accessibilityState={{ selected: isChosen }}
              accessibilityLabel={t.t(ACTION_LABEL_KEYS[action])}
              style={{
                minHeight: 44,
                flexGrow: 1,
                flexBasis: 140,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 14,
                borderRadius: radius.md,
                borderWidth: isPrimary ? 0 : 1,
                borderColor: T.divider,
                backgroundColor: isPrimary ? colors.label : 'transparent',
                opacity: chosen && !isChosen ? 0.45 : 1,
              }}
            >
              <Text
                style={{
                  ...type.callout,
                  fontWeight: '600',
                  color: isPrimary ? colors.inverse : T.ink2,
                }}
              >
                {isChosen && action === 'add_to_candidates'
                  ? t.t('should_i_buy.action.added')
                  : t.t(ACTION_LABEL_KEYS[action])}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {chosen === 'recheck_color' ? (
        <Text style={{ ...type.caption, color: T.ink3 }}>{t.t('should_i_buy.action.recheckColorHint')}</Text>
      ) : null}
    </View>
  );
}

/**
 * V3-015 — §5.5's "Avatar None" entry: the decision is already complete, and
 * this is the quiet way to ask for a visual on top of it.
 *
 * Deliberately the least emphasized block on the card. §5.4 layer 4 is
 * CONDITIONAL and §9.2 says the preview area must not take the page over, so
 * this is a bordered row with a caption — not a filled button, which would put a
 * second emphasis beside the judgment and break V3-009 acceptance 2.
 *
 * It renders only when `previewSetupEntryVisible` says so, i.e. when the
 * decision itself says a visual would help and the profile is in a state this
 * flow can actually serve. Everything else — flag off, probe failed, avatar
 * ready, avatar revoked — renders nothing at all rather than a disabled or
 * explanatory placeholder (contract §2 rollback rule 2, low-density rule).
 */
function VisualSetupEntry({ onPress, t }: { onPress: () => void; t: UseT }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t.t('should_i_buy.preview.entry')}
      style={{
        minHeight: 44,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: T.divider,
      }}
    >
      <SystemIcon name="camera" size={16} color={T.ink3} strokeWidth={1.8} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ ...type.callout, color: T.ink2 }}>{t.t('should_i_buy.preview.entry')}</Text>
        {/* Says a photo is involved before the tap, so opening a setup screen is
            not a surprise; the full explanation still waits until after it, which
            is where §5.5 puts it. */}
        <Text style={{ ...type.caption, color: T.ink3, lineHeight: 16 }}>
          {t.t('should_i_buy.preview.entryHint')}
        </Text>
      </View>
    </Pressable>
  );
}

type EmitV3 = <E extends V3FeOwnedEvent>(event: E, payload: V3EventPayloads[E]) => void;

/**
 * V3-019 — §5.4 layer 4 for a user whose reference is already usable: the
 * static preview lifecycle (ask → §9.5 status line → ready | fallback), in the
 * same conditional slot V3-015's setup entry occupies for users without one.
 *
 * All decisions live in `visualPreviewMapping.ts`; this component runs the
 * loop and renders the phase. The loop's shape:
 *
 * - The tap is the per-request ask (contract §6.1's `consent: true` — the
 *   entry copy names the likeness use before the tap, so the value is
 *   informed). `v3_preview_requested` fires here, on the user action, whatever
 *   the POST later answers.
 * - Polls ride the ungated M10 GET, silenced: an optional surface's blips must
 *   never toast over the decision card (§3.6).
 * - The loop stops on `ready`, on the collapsed no-result terminal (failed /
 *   rejected / unknown status — one §9.5 copy, frozen §6.2 degradation rule),
 *   on a refusal, or when the watch window is spent (`still_working`, which is
 *   NOT a failure — §9.5's background path; checking again is free by §6.3's
 *   cache key). Every one of these leaves the decision card fully intact: the
 *   way forward from a preview that did not happen is the evidence already on
 *   screen, never a retry treadmill (acceptance 4).
 * - `runRef` fences the loop: unmount (or a remount under a new `key`, i.e. a
 *   new decision) invalidates the run id, so a stale poll can neither write
 *   state nor emit an event against the wrong decision.
 *
 * `v3_preview_viewed` fires once per settled lifecycle: `shown` for a render
 * on screen, `fallback` when the user was returned to the decision evidence.
 * `still_working` and quiet refusals emit nothing — no render outcome was
 * viewed, and a guessed value would poison the preview-usefulness metric.
 */
function VisualPreviewSection({
  decisionId,
  avatarStatus,
  emit,
  t,
}: {
  decisionId: string;
  avatarStatus: AvatarStatus;
  emit: EmitV3;
  t: UseT;
}) {
  const [phase, setPhase] = useState<PreviewPhase>(IDLE);
  const runRef = useRef(0);
  useEffect(
    () => () => {
      runRef.current += 1;
    },
    [],
  );

  const settle = (next: PreviewPhase) => {
    setPhase(next);
    const result = previewViewedResult(next);
    if (result) emit('v3_preview_viewed', { result });
  };

  const start = async () => {
    if (!previewRequestAllowed(phase)) return;
    const run = ++runRef.current;
    emit('v3_preview_requested', {
      concern: DEFAULT_PREVIEW_CONCERN,
      avatar_status: avatarStatus,
    });
    setPhase(REQUESTING);
    let assetId: string;
    try {
      assetId = (await requestVisualPreview(decisionId, DEFAULT_PREVIEW_CONCERN)).assetId;
    } catch (error) {
      if (run !== runRef.current) return;
      settle({
        kind: 'unavailable',
        reason: toPreviewUnavailableReason(error as PreviewHttpErrorLike),
      });
      return;
    }
    if (run !== runRef.current) return;
    let current = previewRequested(assetId);
    setPhase(current);
    // First read immediately — a cache hit is already terminal and must not
    // wait an interval to say so — then one read per interval.
    while (current.kind === 'generating') {
      let next: PreviewPhase;
      try {
        next = previewPolled(
          current,
          await getOutfitVisualAsset(assetId, { silentErrorToast: true }),
        );
      } catch {
        next = previewPollErrored(current);
      }
      if (run !== runRef.current) return;
      current = next;
      if (current.kind !== 'generating') break;
      setPhase(current);
      await new Promise((resolve) => setTimeout(resolve, PREVIEW_POLL_INTERVAL_MS));
      if (run !== runRef.current) return;
    }
    settle(current);
  };

  const entryRow = (labelKey: I18nKey, hintKey: I18nKey | null) => (
    <Pressable
      onPress={() => void start()}
      accessibilityRole="button"
      accessibilityLabel={t.t(labelKey)}
      style={{
        minHeight: 44,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: T.divider,
      }}
    >
      <SystemIcon name="photo" size={16} color={T.ink3} strokeWidth={1.8} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ ...type.callout, color: T.ink2 }}>{t.t(labelKey)}</Text>
        {hintKey ? (
          <Text style={{ ...type.caption, color: T.ink3, lineHeight: 16 }}>{t.t(hintKey)}</Text>
        ) : null}
      </View>
    </Pressable>
  );

  if (phase.kind === 'idle') {
    return entryRow('should_i_buy.preview.generate', 'should_i_buy.preview.generateHint');
  }
  if (phase.kind === 'requesting' || phase.kind === 'generating') {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 }}>
        <ActivityIndicator size="small" color={T.ink3} />
        <Text style={{ ...type.footnote, color: T.ink3, flex: 1 }}>
          {t.t('should_i_buy.preview.generating')}
        </Text>
      </View>
    );
  }
  if (phase.kind === 'ready') {
    // V3-020 — the honest ready presentation, top to bottom: the render (data
    // layer, so sharp corners — evidence, not a control; 3:4 matches the §6.4
    // pipeline's canvas), a caption naming WHAT the picture is (the candidate
    // plus the user's own items — §5.4 layer 4 composes a full outfit, and the
    // caption keeps that from reading as a product-only try-on), then the
    // lightweight feedback row. The §5.4 layer-5 boundary sentence renders
    // directly below this slot at the card level, unconditionally — see the
    // layer-5 comment in the card. Judgment, reasons and actions all stay on
    // screen around this block: the preview is one layer inside the decision
    // card, never a page of its own (acceptance 4, §9.2).
    return (
      <View style={{ gap: 8 }}>
        <Image
          source={{ uri: phase.imageUrl }}
          accessibilityLabel={t.t('should_i_buy.preview.readyAlt')}
          resizeMode="cover"
          style={{ width: '100%', aspectRatio: 3 / 4, backgroundColor: T.bg }}
        />
        <Text style={{ ...type.caption, color: T.ink3, lineHeight: 17 }}>
          {t.t('should_i_buy.preview.readyCaption')}
        </Text>
        <PreviewFeedbackRow assetId={phase.assetId} emit={emit} t={t} />
      </View>
    );
  }
  if (phase.kind === 'no_result') {
    return (
      <Text style={{ ...type.footnote, color: T.ink3, lineHeight: 18 }}>
        {t.t('should_i_buy.preview.noResult')}
      </Text>
    );
  }
  if (phase.kind === 'still_working') {
    return (
      <View style={{ gap: 8 }}>
        <Text style={{ ...type.footnote, color: T.ink3, lineHeight: 18 }}>
          {t.t('should_i_buy.preview.stillWorking')}
        </Text>
        <Pressable
          onPress={() => void start()}
          accessibilityRole="button"
          accessibilityLabel={t.t('should_i_buy.preview.checkAgain')}
          style={{
            minHeight: 44,
            alignSelf: 'flex-start',
            justifyContent: 'center',
            paddingHorizontal: 14,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: T.divider,
          }}
        >
          <Text style={{ ...type.footnote, fontWeight: '600', color: T.ink2 }}>
            {t.t('should_i_buy.preview.checkAgain')}
          </Text>
        </Pressable>
      </View>
    );
  }
  // `unavailable` — a calm caption or, for the two quiet reasons, nothing at
  // all (the mapping decides). A transient `error` keeps the entry on offer.
  const captionKey = previewUnavailableCaptionKey(phase.reason);
  if (captionKey === null) return null;
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ ...type.footnote, color: T.ink3, lineHeight: 18 }}>{t.t(captionKey)}</Text>
      {phase.reason === 'error'
        ? entryRow('should_i_buy.preview.generate', null)
        : null}
    </View>
  );
}

/**
 * V3-020 — the lightweight fidelity ask under a ready render: one prompt line,
 * the frozen three verdicts (§6.1 / `v3_preview_feedback` — one vocabulary,
 * two channels), one tap. The tap emits the FE-owned event (the channel every
 * dashboard metric is defined over) and fires the §6.1 record POST, then the
 * row settles: the chosen chip stays highlighted and a quiet thanks line
 * replaces the prompt. Single-shot by design — a re-answer would put a second
 * event under the same render into the looks-like-me denominator (see
 * `previewFeedbackMapping.ts`). No toast in either direction: feedback is a
 * learning signal, and both its loss and its success are too small to
 * interrupt a purchase judgment for (§3.6).
 */
function PreviewFeedbackRow({
  assetId,
  emit,
  t,
}: {
  assetId: string;
  emit: EmitV3;
  t: UseT;
}) {
  const [state, setState] = useState<PreviewFeedbackState>(FEEDBACK_OPEN);

  const send = (verdict: PreviewFeedbackVerdict) => {
    if (!previewFeedbackAllowed(state)) return;
    setState(previewFeedbackSent(verdict));
    emit('v3_preview_feedback', { verdict });
    sendVisualPreviewFeedback(assetId, verdict);
  };

  const sentVerdict = state.kind === 'sent' ? state.verdict : null;

  return (
    <View style={{ gap: 8 }}>
      <Text style={{ ...type.caption, color: T.ink3, lineHeight: 17 }}>
        {t.t(sentVerdict ? 'should_i_buy.preview.feedbackThanks' : 'should_i_buy.preview.feedbackPrompt')}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {PREVIEW_FEEDBACK_VERDICTS.map((verdict) => {
          const chosen = sentVerdict === verdict;
          const disabled = sentVerdict !== null;
          return (
            <Pressable
              key={verdict}
              onPress={() => send(verdict)}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityState={{ disabled, selected: chosen }}
              accessibilityLabel={t.t(previewFeedbackLabelKey(verdict))}
              style={{
                minHeight: 44,
                justifyContent: 'center',
                paddingHorizontal: 14,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: chosen ? T.ink : T.divider,
                opacity: disabled && !chosen ? 0.42 : 1,
              }}
            >
              <Text
                style={{
                  ...type.footnote,
                  fontWeight: chosen ? '600' : '400',
                  color: chosen ? T.ink : T.ink2,
                }}
              >
                {t.t(previewFeedbackLabelKey(verdict))}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Every known error state renders a message and either an explicit retry or a
 * way back — never a dead end and never a silent failure (V3-008 acceptance 3
 * consumed here; §3.6). */
function ErrorCard({
  state,
  onRetry,
  t,
}: {
  state: DecisionErrorState;
  onRetry: () => void;
  t: UseT;
}) {
  const view = errorView(state);
  return (
    <View style={{ backgroundColor: T.card, borderRadius: radius.lg, padding: 16, gap: 10, ...shadow.soft }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <SystemIcon name="exclamation" size={16} color={colors.cautionAmber} strokeWidth={1.9} />
        <Text style={{ ...type.body, color: T.ink2, flex: 1, lineHeight: 21 }}>{t.t(view.messageKey)}</Text>
      </View>
      {view.detail ? (
        <Text style={{ ...type.caption, color: T.ink3, lineHeight: 16 }}>{view.detail}</Text>
      ) : null}
      {view.retryable ? (
        <Pressable
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel={t.t('common.retry')}
          style={{
            minHeight: 44,
            alignSelf: 'flex-start',
            minWidth: 120,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 16,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: T.divider,
          }}
        >
          <Text style={{ ...type.footnote, fontWeight: '600', color: T.ink2 }}>{t.t('common.retry')}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function ShouldIBuyScreen({ navigation }: Props) {
  const t = useT();
  const eventContext = useV3EventContext();
  const showToast = useToastStore((s) => s.show);

  const [url, setUrl] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [objectKey, setObjectKey] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<DecisionResult | null>(null);
  const [errorState, setErrorState] = useState<DecisionErrorState | null>(null);
  const [chosenAction, setChosenAction] = useState<RenderedAction | null>(null);
  // V3-015 — what the avatar profile says the visual entry may offer, or null
  // while unknown (never probed, probe failed, or the flag is off). Null renders
  // no entry: an optional V3 surface self-hides rather than explaining itself.
  // V3-019 widened it to carry the raw status too: `v3_preview_requested`
  // declares `avatar_status` (the frozen enum), and `already_ready` covers two
  // statuses (`ready` / `refresh_recommended`) the event must tell apart.
  const [avatarProbe, setAvatarProbe] = useState<{
    start: AvatarSetupStart;
    status: AvatarStatus;
  } | null>(null);
  // The current attempt's flow id, and whether we left the screen for the
  // existing-item alternative rather than for good. See the focus effect below.
  const flowIdRef = useRef<string | null>(null);
  const handedOffRef = useRef(false);
  /** Did this focus session resume a suspended attempt? Only then may the flow
   *  be re-asserted — see `ensureResumedFlow`. */
  const resumedFlowRef = useRef(false);

  /**
   * V3-015 — the INBOUND half of the race the setup screen closes outbound.
   *
   * React Navigation does not guarantee that the blurring screen's cleanup runs
   * before the focusing screen's effect, so the hand-off target's `endV3Flow`
   * can land AFTER this screen re-adopted on focus — clearing the id from under
   * a card that is fully interactive again. The outbound direction was fixed by
   * re-asserting immediately before anything that must carry the flow
   * (`AvatarPhotoSetupScreen.ensureFlow`); this is the same move on the way
   * back, so the ordering stops mattering in both directions instead of being
   * relied upon in one.
   *
   * Deliberately scoped to a RESUMED attempt: re-adopting on any emit would
   * resurrect a stale id after an unrelated tab switch, which is the leak the
   * blur closer exists to prevent. Re-asserting the same id is idempotent.
   */
  const ensureResumedFlow = useCallback(() => {
    if (resumedFlowRef.current && flowIdRef.current) adoptV3Flow(flowIdRef.current);
  }, []);

  const emit = useCallback(
    <E extends V3FeOwnedEvent>(event: E, payload: V3EventPayloads[E]) => {
      ensureResumedFlow();
      // No identity yet ⇒ no event. An orphaned envelope is worse than a gap.
      const context = eventContext();
      if (context) trackV3(event, payload, context);
    },
    [ensureResumedFlow, eventContext],
  );

  // One flow = one "should I buy this" attempt, with exactly ONE opener
  // (submitting) and ONE closer (leaving the screen). That invariant is
  // load-bearing rather than tidy: every decision event declares
  // `flow_id: required` and `trackV3` THROWS in a dev build on a contract
  // violation, so any code path that closed the flow while the card was still
  // interactive would turn the next tap into a red screen.
  //
  // Closing hangs off BLUR, not unmount: this repo's tabs are persistent and
  // never unmount on a tab switch (repo CLAUDE.md), so an unmount cleanup would
  // often never run — and a flow left open keeps the client interceptor
  // stamping X-Correlation-Id onto other tabs' unrelated requests.
  //
  // V3-010 adds exactly one exception, scoped to the round trip it needs: the
  // existing-item hand-off leaves this screen and comes back to the SAME card,
  // so the attempt is not over and its later actions must keep the same
  // `flow_id`. The flow is therefore suspended on blur and re-adopted on
  // return — but ONLY when we handed off. Re-adopting on every focus would
  // resurrect a stale id after an unrelated ten-minute tab switch and stamp it
  // onto fresh requests, which is the leak the blur closer exists to prevent.
  /**
   * V3-015 — what, if anything, the visual entry may offer.
   *
   * Probed only once a decision is on screen, because §5.5 is explicit that the
   * complete purchase judgment comes first and the visual question comes after
   * it; probing at mount would spend a request on a screen that may never show a
   * decision at all. Silent by construction: any failure — 503 with the flag
   * off, network, 404 — leaves `avatarProbe` null and the entry simply absent
   * (contract §2 rollback rule 2). The user asked for a purchase judgment, not
   * for this, so its failure must not appear anywhere on their screen.
   */
  const probeAvatar = useCallback(async () => {
    if (!enableV3Avatar) return;
    try {
      const profile = await getAvatarProfile();
      setAvatarProbe({ start: avatarSetupStart(profile), status: profile.status });
    } catch {
      setAvatarProbe(null);
    }
  }, []);

  // THE DEPENDENCY LIST IS LOAD-BEARING, AND `result` MUST NOT BE IN IT.
  //
  // `useFocusEffect` keys its inner `useEffect` on this callback's identity, so a
  // dependency that changes mid-visit runs the effect's CLEANUP — which is
  // `endV3Flow`. V3-015 first added `result` here (to skip a pointless probe) and
  // that silently killed the flow the moment a decision arrived: the card was
  // still interactive, `v3_decision_action` declares `flow_id: required`, and
  // `trackV3` throws in a dev build and drops the event in production. The probe
  // that caught it is `.agent-artifacts/v3-015/decision-action-flow-probe.mjs`,
  // run against the broken tree before the fix. `probeAvatar` is stable
  // (`useCallback(…, [])`), so this list never changes and V3-009/V3-010's
  // one-opener/one-closer invariant is intact.
  useFocusEffect(
    useCallback(() => {
      if (handedOffRef.current && flowIdRef.current) {
        adoptV3Flow(flowIdRef.current);
        // Arms `ensureResumedFlow` for the rest of this focus session, because
        // the hand-off target's cleanup may still be about to clear the id.
        resumedFlowRef.current = true;
      }
      // Returning from the setup screen: the profile has very likely moved
      // (`preparing`, or `ready` if it was already prepared), and the entry must
      // reflect that instead of inviting the user back into a flow they just
      // completed. Re-probed only on a hand-off return, for the same reason the
      // flow is only re-adopted then — and unconditionally, because a hand-off can
      // only originate from a card that was rendered.
      if (handedOffRef.current) void probeAvatar();
      handedOffRef.current = false;
      return () => {
        resumedFlowRef.current = false;
        endV3Flow();
      };
    }, [probeAvatar]),
  );

  const runDecision = useCallback(async (): Promise<DecisionResult> => {
    const sourceType = sourceTypeForInput(objectKey !== null);
    // Kept so the same attempt can re-adopt its own id after the existing-item
    // hand-off; a new submit is a new attempt and overwrites it.
    flowIdRef.current = beginV3Flow();
    emit('v3_decision_started', { source_type: sourceType });
    const candidate = await createPurchaseCandidate(
      objectKey !== null
        ? { sourceType, sourceAssetId: objectKey }
        : { sourceType, sourceUrl: url.trim() },
      { silentErrorToast: true },
    ).catch((error: unknown) => {
      // `create`'s 404 means "unusable source", not "missing resource" — the
      // two endpoints therefore map their failures with different contexts.
      throw withEndpointContext(error, 'create');
    });
    // Parsing is synchronous in P0 (contract §5.2), so this loop normally runs
    // zero times — but the contract reserves `submitted` for asynchronous
    // parsing, and deciding on an unparsed candidate would ask for a judgment
    // before the evidence exists (codex review, FE#141). Bounded: unknown
    // statuses are terminal by the frozen skew rule, so this can never spin.
    let settled = candidate;
    for (let attempt = 0; !settled.isTerminal && attempt < MAX_PARSE_POLLS; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, PARSE_POLL_MS));
      settled = await getPurchaseCandidate(settled.id, { silentErrorToast: true }).catch(
        (error: unknown) => {
          throw withEndpointContext(error, 'read');
        },
      );
    }
    // A `parse_failed` candidate is still decidable — partial information,
    // not a dead end (contract §5.2).
    const decision = await decidePurchaseCandidate(settled.id, 'none', {
      silentErrorToast: true,
    }).catch((error: unknown) => {
      throw withEndpointContext(error, 'decide');
    });
    return { candidate: settled, decision };
  }, [emit, objectKey, url]);

  const decisionMutation = useMutation({
    mutationFn: runDecision,
    onMutate: () => {
      setErrorState(null);
      setResult(null);
      setChosenAction(null);
    },
    onSuccess: (next) => {
      setResult(next);
      const value = viewedEventDecision(next.decision);
      // A skewed unknown decision still renders (server copy) but is never
      // emitted — the frozen enum would reject it.
      if (value) emit('v3_decision_viewed', { decision: value });
      // The decision is on screen and complete; only now is the visual question
      // worth asking about (§5.5).
      void probeAvatar();
    },
    onError: (error: unknown) => {
      // The flow deliberately stays OPEN: the attempt is not over while the
      // retry button is on screen, and blur is the single closer.
      setErrorState(toDecisionErrorState(error as HttpErrorLike, endpointContextOf(error)));
    },
  });

  // Derived before the handlers that read it, so the reuse hand-off does not
  // depend on a binding declared further down the component.
  const card = result ? buildDecisionCard(result.decision) : null;

  /**
   * V3-015 — §5.5's "the user actively asks for a visual" moment.
   *
   * The hand-off is the V3-010 one: `handedOffRef` suspends this attempt's flow
   * instead of ending it, so the setup screen re-adopts the SAME `flow_id` and
   * its avatar prompt joins this decision on the V3-002 dashboard — without
   * which kill criterion 4 ("does asking for a photo cost decisions?") cannot be
   * computed at all. Nothing about the decision is unmounted, cleared or
   * re-fetched: `goBack` returns to this card exactly as it is (acceptance 1).
   */
  const openVisualSetup = () => {
    handedOffRef.current = true;
    navigation.navigate('AvatarPhotoSetup', { flowId: flowIdRef.current ?? undefined });
  };

  const onUpload = async () => {
    setUploading(true);
    try {
      const picked = await pickAndUploadImage('v3-candidate');
      if (picked) {
        setImageUri(picked.uri);
        // The DURABLE reference (contract §5.2) — never the TTL-bound fileUrl.
        setObjectKey(picked.objectKey);
      }
    } catch (e) {
      showToast({ message: uploadErrorMessage(e), kind: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const clearImage = () => {
    setImageUri(null);
    setObjectKey(null);
  };

  const onChooseAction = (action: RenderedAction) => {
    setChosenAction(action);
    // No `endV3Flow()` here. Choosing an action does not remove the card, so a
    // second tap is a normal thing for a user to do — and closing the flow on
    // the first tap made that second emit fail validation and throw.
    //
    // The reuse choice is recorded as exactly this event and nothing else: no
    // candidate is added, no shopping surface opens, so the V3-002 dashboard
    // reads it as a reuse outcome rather than a purchase conversion (feature
    // acceptance 3).
    emit('v3_decision_action', { action });
    if (action === 'style_with_existing') openExistingItemAlternative();
  };

  /** §5.4 layer 6's "用现有类似单品搭一套" — §4.2's 回流动作, reached with the
   * owned item the decision named. The destination is not a new screen: the
   * item-scoped Ask is where this app already builds an outfit AROUND one owned
   * piece, and it does so from the wardrobe alone (its backend prompt makes the
   * focused item mandatory and its candidate list is wardrobe-only). Pushing on
   * THIS stack, not a tab jump, is what lets `goBack` land on this same card
   * with its decision still on screen. */
  const openExistingItemAlternative = () => {
    const anchorId = card?.reuseAnchorId;
    // `buildDecisionCard` does not offer the action without an anchor, so this
    // is unreachable defence rather than a user-visible branch.
    if (!anchorId) return;
    handedOffRef.current = true;
    navigation.navigate('AskAidrobe', {
      focusedItemId: anchorId,
      autoAsk: t.t('should_i_buy.action.styleWithExistingQuestion'),
    });
  };

  const canSubmit =
    (objectKey !== null || url.trim().length > 0) && !decisionMutation.isPending && !uploading;

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <ScreenHeader title={t.t('should_i_buy.title')} onBack={() => navigation.goBack()} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: spacing.screen, paddingBottom: 100, gap: 16 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* §5.2 — the natural entrances, no "new try-on project" ceremony. */}
        <View style={{ backgroundColor: T.card, borderRadius: radius.xl, padding: 16, gap: 12, ...shadow.soft }}>
          <Text style={{ ...type.footnote, color: T.ink3, lineHeight: 18 }}>
            {t.t('should_i_buy.input.hint')}
          </Text>

          {imageUri ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <ImageThumb
                uri={imageUri}
                size={56}
                cornerRadius={radius.sm}
                fallbackLabel={t.t('should_i_buy.candidate.fallbackName')}
              />
              <Text style={{ ...type.footnote, color: T.ink2, flex: 1 }}>
                {t.t('should_i_buy.input.uploaded')}
              </Text>
              <Pressable
                onPress={clearImage}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel={t.t('should_i_buy.input.clearImage')}
              >
                <SystemIcon name="x" size={16} color={T.ink3} />
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={onUpload}
              disabled={uploading}
              accessibilityRole="button"
              accessibilityLabel={t.t('should_i_buy.input.upload')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                minHeight: 48,
                borderRadius: radius.md,
                borderWidth: 1.5,
                borderColor: colors.separator,
                borderStyle: 'dashed',
              }}
            >
              {uploading ? (
                <ActivityIndicator color={T.accent} />
              ) : (
                <>
                  <SystemIcon name="camera" size={18} color={T.accent} strokeWidth={1.8} />
                  <Text style={{ ...type.callout, color: T.ink2 }}>{t.t('should_i_buy.input.upload')}</Text>
                </>
              )}
            </Pressable>
          )}

          <Text style={{ ...type.footnote, color: T.ink3 }}>{t.t('should_i_buy.input.or')}</Text>
          <TextInput
            value={url}
            onChangeText={setUrl}
            editable={objectKey === null}
            placeholder={t.t('should_i_buy.input.placeholder')}
            placeholderTextColor={colors.quaternaryLabel}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            accessibilityLabel={t.t('should_i_buy.input.or')}
            style={{
              backgroundColor: T.bg,
              borderRadius: radius.md,
              paddingHorizontal: 14,
              paddingVertical: 12,
              ...type.body,
              color: T.ink,
              opacity: objectKey === null ? 1 : 0.4,
            }}
          />

          <Pressable
            onPress={() => decisionMutation.mutate()}
            disabled={!canSubmit}
            accessibilityRole="button"
            accessibilityState={{ disabled: !canSubmit, busy: decisionMutation.isPending }}
            accessibilityLabel={t.t('should_i_buy.input.submit')}
            style={{
              minHeight: 50,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: radius.md,
              backgroundColor: colors.label,
              opacity: canSubmit ? 1 : 0.42,
            }}
          >
            <Text style={{ ...type.body, fontWeight: '700', color: colors.inverse }}>
              {decisionMutation.isPending
                ? t.t('should_i_buy.input.checking')
                : t.t('should_i_buy.input.submit')}
            </Text>
          </Pressable>
        </View>

        {errorState ? (
          <ErrorCard state={errorState} onRetry={() => decisionMutation.mutate()} t={t} />
        ) : null}

        {/* The decision card: §5.4 layers 1, 2, 3, 5, 6 — layer 4 (visual
            preview) is absent by design, so nothing here depends on an avatar
            or a visual provider (feature acceptance 1). */}
        {result && card ? (
          <View style={{ backgroundColor: T.card, borderRadius: radius.xl, padding: 16, gap: 16, ...shadow.soft }}>
            <CandidateHeader candidate={result.candidate} t={t} />

            <Judgment decision={result.decision} t={t} />

            {card.reasons.length > 0 ? (
              <Section title={t.t('should_i_buy.section.reasons')}>
                <View style={{ gap: 8 }}>
                  {card.reasons.map((reason, index) => (
                    <View key={`${reason.kind}-${index}`} style={{ flexDirection: 'row', gap: 8 }}>
                      <Text style={{ ...type.body, color: T.ink3, lineHeight: 22 }}>·</Text>
                      <Text style={{ ...type.body, color: T.ink2, flex: 1, lineHeight: 22 }}>
                        {reason.text}
                      </Text>
                    </View>
                  ))}
                </View>
              </Section>
            ) : null}

            {card.comparison ? <ClosetComparison comparison={card.comparison} t={t} /> : null}

            {/* §5.4 layer 4 / §9.2's conditional preview area, in its place in
                the layer order. Two disjoint occupants (see
                `previewGenerateEntryVisible`): V3-015's SETUP entry for a user
                without a usable reference, and V3-019's preview lifecycle for a
                user with one. The FE flag gates only the second — with it off,
                `already_ready` renders nothing, exactly V3-015's shipped
                behavior. `key` remounts the lifecycle per decision, so one
                decision's poll can never write its phase onto the next. */}
            {avatarProbe &&
            previewSetupEntryVisible({
              visualNeed: result.decision.visualNeed,
              start: avatarProbe.start,
            }) ? (
              <VisualSetupEntry onPress={openVisualSetup} t={t} />
            ) : avatarProbe &&
              enableV3StaticTryon &&
              previewGenerateEntryVisible({
                visualNeed: result.decision.visualNeed,
                start: avatarProbe.start,
              }) ? (
              <VisualPreviewSection
                key={result.decision.id}
                decisionId={result.decision.id}
                avatarStatus={avatarProbe.status}
                emit={emit}
                t={t}
              />
            ) : null}

            {/* §5.4 layer 5 — the boundary the product must never overstate.
                V3-020 made the line unconditional: the server renders the same
                sentence into every decision's `boundary_note`, but the wire
                type allows null, and a ready render above this slot with no
                boundary line is exactly the overstatement §7 forbids. So a
                missing server note falls back to the client-side fixed copy
                (V3_SPEC §14 verbatim) instead of rendering nothing. */}
            <Text style={{ ...type.caption, color: T.ink3, lineHeight: 17 }}>
              {card.boundaryNote ?? t.t(PREVIEW_BOUNDARY_FALLBACK_KEY)}
            </Text>

            <NextActions actions={card.actions} chosen={chosenAction} onChoose={onChooseAction} t={t} />
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

/** §9.2's "product thumbnail + name" row, honestly built: the frozen candidate
 * carries neither, so the row shows the parsed attributes we actually have and
 * says so when the parser could not read the source. */
function CandidateHeader({ candidate, t }: { candidate: PurchaseCandidate; t: UseT }) {
  const summary = candidateSummary(candidate);
  const parts = [
    summary.category ? t.tEnum('category', summary.category) : null,
    ...summary.colors.map((c) => t.tEnum('color', c)),
    summary.price,
  ].filter((part): part is string => !!part);

  return (
    <View style={{ gap: 4 }}>
      <Text style={{ ...type.headline, color: T.ink }}>
        {parts.length > 0 ? parts.join(' · ') : t.t('should_i_buy.candidate.fallbackName')}
      </Text>
      {summary.parseIncomplete ? (
        <Text style={{ ...type.caption, color: T.ink3, lineHeight: 16 }}>
          {t.t('should_i_buy.candidate.partialParse')}
        </Text>
      ) : null}
    </View>
  );
}

/** Which §5.1 endpoint failed. Tagged at the throw site rather than sniffed
 * from the axios config, because only the caller knows which step it was in —
 * and `create`'s 404 maps to a different, input-recoverable state than
 * `decide`'s (V3-008 / codex review FE#137). */
type TaggedError = { v3Endpoint?: DecisionEndpointContext };

function withEndpointContext(error: unknown, endpoint: DecisionEndpointContext): unknown {
  if (error && typeof error === 'object') (error as TaggedError).v3Endpoint = endpoint;
  return error;
}

function endpointContextOf(error: unknown): DecisionEndpointContext {
  return (error as TaggedError)?.v3Endpoint ?? 'decide';
}
