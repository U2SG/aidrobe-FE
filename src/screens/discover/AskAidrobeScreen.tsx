import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { askAidrobe, getAskHistory } from '@/api/ask';
import { InlineRetry } from '@/components/feedback/InlineRetry';
import { HeaderIconButton, ScreenHeader } from '@/components/layout/ScreenHeader';
import { AIOrb } from '@/components/ui/AIOrb';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { SystemIcon } from '@/components/ui/SystemIcon';
import { ItemRefsRow } from '@/components/wardrobe/ItemRefsRow';
import type { ContextualEntry } from '@/components/discover/ContextualEntrySheet';
import { ContextualEntrySheet } from '@/components/discover/ContextualEntrySheet';
import { useT } from '@/hooks/useT';
import { useTrack } from '@/hooks/useTrack';
import { useWardrobeItemNames } from '@/hooks/useWardrobeItemNames';
import { enableMvpV2Ui } from '@/lib/featureFlags';
import type { I18nKey } from '@/i18n';
// useToastStore removed — contextual-entry toasts replaced with real navigation
import { colors, radius, shadow, spacing, type } from '@/theme/design';
import type { AskHistoryEntry, AskItemRefSnapshot, AskScope } from '@/types/api';
import type { AskStackParamList } from '@/types/navigation';
import { httpStatus } from '@/utils/http';

// Typed against the narrow AskStackParamList so this screen mounts in both the
// V2 Ask tab (exact match) and the V1 Discover stack (its wider navigation is
// assignable to this narrower requirement). It only ever calls goBack().
type Props = NativeStackScreenProps<AskStackParamList, 'AskAidrobe'>;

type Turn = {
  id: string;
  question: string;
  answer: string | null;
  itemRefs: string[];
  itemRefSnapshots: AskItemRefSnapshot[];
  pending: boolean;
  failed?: boolean;
  // Constraints the multi-turn conversation carried into this answer (BE
  // deltas.applied_constraints) — shown so continuity is visible, not silent.
  appliedConstraints?: string[];
};

const FALLBACK_COMPOSER_HEIGHT = 112;
const HISTORY_LIMIT = 20;

// Suggestion prompts shown in the idle/empty state hero card (brief v0.9 Ask V2).
const SUGGESTIONS = [
  { key: 's1', icon: 'sparkle', labelKey: 'ask.v2.s1' },
  { key: 's2', icon: 'compass', labelKey: 'ask.v2.s2' },
  { key: 's3', icon: 'suitcase', labelKey: 'ask.v2.s3' },
] as const satisfies ReadonlyArray<{ key: string; icon: string; labelKey: I18nKey }>;

// One tappable icon+label+chevron row in the idle hero card. The row layout
// deliberately sits on an inner View: putting flexDirection etc. in a
// Pressable style FUNCTION loses the layout on-device (new arch) and the
// children render stacked; web is unaffected, which is how it slipped past
// web-based verification.
function HeroRow({
  icon,
  label,
  onPress,
  accessibilityLabel,
}: {
  icon: React.ComponentProps<typeof SystemIcon>['name'];
  label: string;
  onPress: () => void;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      android_ripple={{ color: colors.fill }}
      style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 13,
          paddingHorizontal: 4,
          minHeight: 44,
        }}
      >
        <SystemIcon name={icon} size={18} color={T.ink3} strokeWidth={1.7} />
        <Text style={{ ...type.body, color: T.ink2, flex: 1, marginLeft: 12 }} numberOfLines={1}>
          {label}
        </Text>
        <SystemIcon name="chevronRight" size={16} color={T.ink3} strokeWidth={1.7} />
      </View>
    </Pressable>
  );
}

const T = {
  bg: colors.groupedBackground,
  card: colors.elevated,
  cardSoft: colors.secondaryElevated,
  ink: colors.label,
  ink2: colors.secondaryLabel,
  ink3: colors.tertiaryLabel,
  accent: colors.accent,
};

function historyToTurn(entry: AskHistoryEntry, answerFallback: string): Turn {
  return {
    id: entry.askSessionId,
    question: entry.question,
    answer: entry.answer ?? answerFallback,
    itemRefs: entry.itemRefs,
    itemRefSnapshots: entry.itemRefSnapshots,
    pending: false,
  };
}

function formatHistoryDate(value: string, locale: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  if (locale.startsWith('zh')) {
    return `${date.getMonth() + 1}月${date.getDate()}日 ${hours}:${minutes}`;
  }
  return `${date.getMonth() + 1}/${date.getDate()} ${hours}:${minutes}`;
}

function TurnView({
  turn,
  onRetry,
  retryBusy,
  isFollowUp,
}: {
  turn: Turn;
  onRetry: () => void;
  retryBusy: boolean;
  // "已延续：…" is a multi-turn continuity cue — on the first turn the BE just
  // echoes constraints parsed from the question itself, which reads as noise.
  isFollowUp?: boolean;
}) {
  const { t } = useT();
  return (
    <View style={{ width: '100%', gap: 10, flexShrink: 0, marginBottom: 16 }}>
      {/* Question bubble */}
      <View
        style={{
          alignSelf: 'flex-end',
          maxWidth: '82%',
          backgroundColor: colors.label,
          borderRadius: radius.lg,
          paddingHorizontal: 14,
          paddingVertical: 10,
        }}
      >
        <Text style={{ ...type.body, color: colors.inverse }}>{turn.question}</Text>
      </View>
      {/* Answer card */}
      <View
        style={{
          alignSelf: 'flex-start',
          width: '92%',
          minHeight: 0,
          backgroundColor: T.card,
          borderRadius: radius.lg,
          padding: 14,
          ...shadow.soft,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: turn.pending ? 0 : 8 }}>
          <SystemIcon name="sparkle" size={14} color={T.accent} strokeWidth={1.9} />
          <Text style={{ ...type.caption, color: T.accent, fontWeight: '700', letterSpacing: 0.5 }}>
            {t('ask.turn.brand')}
          </Text>
        </View>
        {turn.pending ? (
          // AI "thinking" presence — the small vivid orb shares the motion
          // language with the Ask empty state and the import processing wait.
          // Explicit 40px: the smallest named preset (sm=72) reads huge inside
          // an answer bubble on device (~3x screenshots showed ~216px).
          <View style={{ alignSelf: 'flex-start', marginTop: 2 }}>
            <AIOrb variant="thinking" size={40} />
          </View>
        ) : (
          <>
            <Text style={{ ...type.body, color: turn.failed ? T.ink3 : T.ink2, lineHeight: 22 }}>
              {turn.answer}
            </Text>
            {!turn.failed && isFollowUp && turn.appliedConstraints?.length ? (
              <Text style={{ ...type.caption, color: T.ink3, marginTop: 6 }} numberOfLines={2}>
                {t('ask.appliedConstraints', { list: turn.appliedConstraints.join(' · ') })}
              </Text>
            ) : null}
            {turn.failed ? (
              // Retry re-fires the original question (kept on the turn), so the
              // user never has to retype.
              <InlineRetry onRetry={onRetry} busy={retryBusy} />
            ) : (
              <ItemRefsRow snapshots={turn.itemRefSnapshots} ids={turn.itemRefs} />
            )}
          </>
        )}
      </View>
    </View>
  );
}

function AskHistoryRow({
  entry,
  onPress,
}: {
  entry: AskHistoryEntry;
  onPress: () => void;
}) {
  const { t, locale } = useT();
  const answer = entry.answer ?? t('ask.history.answerFallback');
  const date = formatHistoryDate(entry.createdAt, locale);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      android_ripple={{ color: colors.fill }}
      style={({ pressed }) => ({ opacity: pressed ? 0.78 : 1 })}
    >
      <View
        style={{
          backgroundColor: colors.secondaryElevated,
          borderRadius: radius.lg,
          padding: 14,
          borderWidth: 1,
          borderColor: colors.separatorSoft,
        }}
      >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ ...type.body, color: colors.label, fontWeight: '600' }} numberOfLines={2}>
            {entry.question}
          </Text>
          <Text
            style={{ ...type.callout, color: colors.secondaryLabel, marginTop: 6, lineHeight: 20 }}
            numberOfLines={3}
          >
            {answer}
          </Text>
        </View>
        {date ? (
          <Text style={{ ...type.caption, color: colors.tertiaryLabel, marginTop: 2 }} numberOfLines={1}>
            {date}
          </Text>
        ) : null}
      </View>
      <ItemRefsRow snapshots={entry.itemRefSnapshots} ids={entry.itemRefs} />
      </View>
    </Pressable>
  );
}

function AskHistorySheet({
  visible,
  entries,
  loading,
  error,
  onClose,
  onRetry,
}: {
  visible: boolean;
  entries: AskHistoryEntry[];
  loading: boolean;
  error: boolean;
  onClose: () => void;
  onRetry: () => void;
}) {
  const { t } = useT();
  const { height } = useWindowDimensions();
  const [selected, setSelected] = useState<AskHistoryEntry | null>(null);
  const maxHeight = Math.min(620, Math.max(280, height * 0.68));

  useEffect(() => {
    if (!visible) setSelected(null);
  }, [visible]);

  const selectedTurn = selected
    ? historyToTurn(selected, t('ask.history.answerFallback'))
    : null;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={selected ? t('ask.history.sessionTitle') : t('ask.history.title')}
    >
      {selectedTurn ? (
        <View style={{ gap: 12 }}>
          <Button
            label={t('common.back')}
            variant="ghost"
            size="sm"
            onPress={() => setSelected(null)}
            icon={<SystemIcon name="chevronLeft" size={16} color={colors.secondaryLabel} />}
            style={{ alignSelf: 'flex-start', minHeight: 40, paddingHorizontal: 8 }}
          />
          <ScrollView
            style={{ maxHeight }}
            contentContainerStyle={{ paddingBottom: 4 }}
            showsVerticalScrollIndicator={false}
          >
            <TurnView turn={selectedTurn} onRetry={() => undefined} retryBusy={false} />
          </ScrollView>
        </View>
      ) : loading ? (
        <View style={{ minHeight: 160, alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <ActivityIndicator color={colors.accent} />
          <Text style={{ ...type.callout, color: colors.tertiaryLabel }}>{t('ask.history.loading')}</Text>
        </View>
      ) : error ? (
        <View style={{ minHeight: 160, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <Text style={{ ...type.callout, color: colors.tertiaryLabel, textAlign: 'center' }}>
            {t('ask.history.error')}
          </Text>
          <Button
            label={t('common.retry')}
            variant="secondary"
            size="sm"
            onPress={onRetry}
            icon={<SystemIcon name="refresh" size={16} color={colors.label} />}
          />
        </View>
      ) : entries.length === 0 ? (
        <View style={{ minHeight: 160, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ ...type.callout, color: colors.tertiaryLabel, textAlign: 'center' }}>
            {t('ask.history.empty')}
          </Text>
        </View>
      ) : (
        <ScrollView
          style={{ maxHeight }}
          contentContainerStyle={{ gap: 12, paddingBottom: 4 }}
          showsVerticalScrollIndicator={false}
        >
          {entries.map((entry) => (
            <AskHistoryRow
              key={entry.askSessionId}
              entry={entry}
              onPress={() => setSelected(entry)}
            />
          ))}
        </ScrollView>
      )}
    </BottomSheet>
  );
}

export function AskAidrobeScreen({ navigation, route }: Props) {
  const { t, locale } = useT();
  const track = useTrack();
  const insets = useSafeAreaInsets();
  const focusedItemId = route.params?.focusedItemId;
  // Scope derives from the entrypoint: focused item → 'item', explicit today
  // param → 'today', otherwise global discover. No forced scene anymore.
  const scope: AskScope = focusedItemId ? 'item' : route.params?.scope === 'today' ? 'today' : 'global';
  const focusedNames = useWardrobeItemNames(focusedItemId ? [focusedItemId] : []);
  const focusedName = focusedItemId ? focusedNames.get(focusedItemId) : undefined;
  const [turns, setTurns] = useState<Turn[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [historyVisible, setHistoryVisible] = useState(false);
  const [contextualSheetVisible, setContextualSheetVisible] = useState(false);
  const [composerHeight, setComposerHeight] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  // Conversation generation. Bumped on new-chat / scope change so an in-flight
  // request's late callback can't reseed conversationId/turns (review on #96).
  const conversationEpoch = useRef(0);

  useEffect(() => {
    track('ask_viewed', { scope });
  }, [track, scope]);

  // Key by scope + focusedItemId so focused and global history never share a
  // cache entry — focused mode must not surface global Asks.
  const historyQuery = useQuery({
    queryKey: ['askHistory', scope, focusedItemId ?? null],
    queryFn: () =>
      getAskHistory({
        limit: HISTORY_LIMIT,
        focusedItemId,
        scope: focusedItemId ? 'item' : scope === 'global' ? undefined : scope,
        entrypoint: focusedItemId ? 'item_detail' : undefined,
      }),
    enabled: historyVisible,
    retry: 1,
  });

  // If the scope / focused item changes while the screen stays mounted, drop
  // the previous session's turns and conversation thread.
  useEffect(() => {
    conversationEpoch.current += 1;
    setTurns([]);
    setConversationId(null);
  }, [scope, focusedItemId]);

  const askMutation = useMutation({
    mutationFn: (vars: {
      tempId: string;
      question: string;
      conversationId: string | null;
      epoch: number;
    }) =>
      askAidrobe({
        question: vars.question,
        focusedItemId,
        locale,
        conversationId: vars.conversationId,
      }),
    onMutate: (vars) => {
      // Idempotent on tempId: a retry reuses the failed turn's own id (already
      // reset to pending by retryTurn), so only a brand-new question appends.
      setTurns((t) =>
        t.some((x) => x.id === vars.tempId)
          ? t
          : [
              ...t,
              {
                id: vars.tempId,
                question: vars.question,
                answer: null,
                itemRefs: [],
                itemRefSnapshots: [],
                pending: true,
              },
            ],
      );
    },
    onSuccess: (result, vars) => {
      // The question really happened — record it — but if the user started a
      // new chat while this was in flight, discard the UI/thread reseed.
      track('ask_sent', { scope });
      if (vars.epoch !== conversationEpoch.current) return;
      // Thread the conversation forward so subsequent sends continue the same
      // multi-turn session on the backend.
      setConversationId(result.conversationId);
      setTurns((t) =>
        t.map((x) =>
          x.id === vars.tempId
            ? {
                id: result.askSessionId,
                question: x.question,
                answer: result.answer,
                itemRefs: result.itemRefs,
                itemRefSnapshots: result.itemRefSnapshots,
                pending: false,
                appliedConstraints: result.deltas?.appliedConstraints ?? [],
              }
            : x,
        ),
      );
    },
    onError: (err, vars) => {
      // Stale (new chat started mid-flight): the turn was already cleared, so
      // there is nothing to mark failed.
      if (vars.epoch !== conversationEpoch.current) return;
      const code = httpStatus(err);
      setTurns((prev) =>
        prev.map((x) =>
          x.id === vars.tempId
            ? {
                ...x,
                pending: false,
                failed: true,
                answer: code === 503 ? t('ask.error.unavailable') : t('ask.error.generic'),
              }
            : x,
        ),
      );
    },
  });

  const submitQuestion = (question: string) => {
    const q = question.trim();
    if (!q || askMutation.isPending) return;
    setInput('');
    askMutation.mutate({
      tempId: `local-${Date.now()}`,
      question: q,
      conversationId,
      epoch: conversationEpoch.current,
    });
  };

  const send = () => {
    if (!input.trim()) return;
    setInput('');
    submitQuestion(input);
  };

  // Retry a failed turn without re-typing: reset it to pending in place
  // (keeping its id + original question) and re-fire reusing the turn's id as
  // tempId. onMutate is idempotent on tempId so it won't append a duplicate;
  // onSuccess/onError reconcile by id.
  const retryTurn = (turn: Turn) => {
    if (askMutation.isPending) return;
    setTurns((t) =>
      t.map((x) =>
        x.id === turn.id ? { ...x, pending: true, failed: false, answer: null } : x,
      ),
    );
    askMutation.mutate({
      tempId: turn.id,
      question: turn.question,
      conversationId,
      epoch: conversationEpoch.current,
    });
  };

  // Contextual entry sheet entries. SenseCheck / PackingList / Insights /
  // WardrobeReport are registered in AskNavigator so they push within the Ask
  // tab. StyleInspirations lives in SettingsStack (ProfileTab) — navigated via
  // getParent() cross-tab.
  const contextualEntries: ContextualEntry[] = [
    {
      key: 'shopping',
      icon: 'bag',
      labelKey: 'contextualEntry.shopping.label',
      hintKey: 'contextualEntry.shopping.hint',
      onPress: () => {
        setContextualSheetVisible(false);
        navigation.navigate('SenseCheck');
      },
    },
    {
      key: 'trip',
      icon: 'suitcase',
      labelKey: 'contextualEntry.trip.label',
      hintKey: 'contextualEntry.trip.hint',
      onPress: () => {
        setContextualSheetVisible(false);
        navigation.navigate('PackingList');
      },
    },
    {
      key: 'insights',
      icon: 'chart',
      labelKey: 'contextualEntry.insights.label',
      hintKey: 'contextualEntry.insights.hint',
      onPress: () => {
        setContextualSheetVisible(false);
        navigation.navigate('Insights');
      },
    },
    {
      key: 'style',
      icon: 'bookmark',
      labelKey: 'contextualEntry.style.label',
      hintKey: 'contextualEntry.style.hint',
      onPress: () => {
        setContextualSheetVisible(false);
        if (enableMvpV2Ui) {
          // V2: Ask is its own tab; StyleInspirations lives in the Profile stack.
          navigation.getParent()?.navigate('ProfileTab', { screen: 'StyleInspirations' } as never);
        } else {
          // V1: Ask is mounted inside the Discover stack, where StyleInspirations
          // is a sibling — and there is no ProfileTab to cross to.
          navigation.navigate('StyleInspirations' as never);
        }
      },
    },
  ];

  const isEmpty = turns.length === 0;
  // Header sits in normal flow (repo standard — see SenseCheckScreen / ItemDetailScreen;
  // ScreenHeader owns its notch inset). Only the absolutely-positioned composer needs
  // measuring, because its height varies (focused-item chip + multiline input).
  const resolvedComposerHeight = composerHeight || FALLBACK_COMPOSER_HEIGHT;
  const handleComposerLayout = (event: LayoutChangeEvent) => {
    setComposerHeight(Math.ceil(event.nativeEvent.layout.height));
  };
  const openHistory = () => {
    setHistoryVisible(true);
  };

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <ScreenHeader
        title={t('ask.title')}
        onBack={() => navigation.goBack()}
        right={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            {turns.length > 0 ? (
              // Start a fresh conversation without restarting the app: drops
              // the rendered turns and the backend conversation thread.
              <HeaderIconButton
                icon="refresh"
                onPress={() => {
                  // Bump the epoch so any in-flight request's late callback is
                  // discarded and can't reseed this fresh chat.
                  conversationEpoch.current += 1;
                  setTurns([]);
                  setConversationId(null);
                  setInput('');
                }}
                accessibilityLabel={t('ask.newConversation')}
              />
            ) : null}
            <HeaderIconButton
              icon="clock"
              onPress={openHistory}
              accessibilityLabel={t('ask.history.open')}
            />
          </View>
        }
      />

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: spacing.screen,
          paddingTop: 8,
          paddingBottom: resolvedComposerHeight + spacing.section + spacing.row,
        }}
        showsVerticalScrollIndicator={false}
        scrollIndicatorInsets={{ bottom: resolvedComposerHeight }}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        keyboardShouldPersistTaps="handled"
      >
        {isEmpty ? (
          <View style={{ paddingTop: 8, paddingBottom: 24 }}>
            {/* Screen subtitle */}
            <Text style={{ ...type.callout, color: T.ink3, marginBottom: 24, lineHeight: 22 }}>
              {t('ask.v2.subtitle')}
            </Text>
            {/* Hero card */}
            <View
              style={{
                backgroundColor: T.card,
                borderRadius: radius.xl,
                paddingTop: 28,
                paddingBottom: 8,
                paddingHorizontal: 20,
                ...shadow.elevated,
              }}
            >
              {/* Warm-gold agent glow (matches the handoff Ask orb + the editorial
                  gold palette — not the vivid blue/violet orb, which is reserved
                  for the in-flight "thinking" state below). */}
              <View style={{ alignItems: 'center', marginBottom: 16 }}>
                <View
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 36,
                    backgroundColor: colors.accentSoft,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.agentGlow }} />
                </View>
              </View>
              {/* Card title */}
              <Text style={{ ...type.title2, color: T.ink, textAlign: 'center', marginBottom: 8 }}>
                {t('ask.v2.cardTitle')}
              </Text>
              {/* Card subtitle */}
              <Text
                style={{
                  ...type.callout,
                  color: T.ink3,
                  textAlign: 'center',
                  marginBottom: 20,
                  lineHeight: 22,
                }}
              >
                {t('ask.v2.cardSub')}
              </Text>
              {/* Divider */}
              <View
                style={{
                  height: 1,
                  backgroundColor: colors.separatorSoft,
                  marginHorizontal: -20,
                  marginBottom: 4,
                }}
              />
              {/* Suggestion rows. Layout lives on an inner View, NOT on the
                  Pressable's style function — on-device (new arch) the
                  function-style layout props get dropped and children stack
                  vertically; web renders both fine. */}
              {SUGGESTIONS.map((s) => (
                <HeroRow
                  key={s.key}
                  icon={s.icon}
                  label={t(s.labelKey)}
                  onPress={() => submitQuestion(t(s.labelKey))}
                />
              ))}
              {/* Item-scoped ask hand-off: real per-item questions start from
                  the wardrobe (item detail → 用这件搭一套); a canned fake-item
                  text here would mislead. */}
              <HeroRow
                icon="wardrobe"
                label={t('ask.v2.pickItem')}
                onPress={() =>
                  navigation.getParent()?.navigate('WardrobeTab' as never)
                }
              />
              {/* Contextual entry trigger — "more" affordance below suggestions */}
              <View
                style={{
                  height: 1,
                  backgroundColor: colors.separatorSoft,
                  marginHorizontal: -20,
                  marginTop: 2,
                  marginBottom: 2,
                }}
              />
              <HeroRow
                icon="plus"
                label={t('contextualEntry.trigger')}
                accessibilityLabel={t('contextualEntry.triggerA11y')}
                onPress={() => setContextualSheetVisible(true)}
              />
            </View>
          </View>
        ) : (
          turns.map((turn, idx) => (
            <TurnView
              key={turn.id}
              turn={turn}
              onRetry={() => retryTurn(turn)}
              retryBusy={askMutation.isPending}
              isFollowUp={idx > 0}
            />
          ))
        )}
      </ScrollView>

      {/* Input bar */}
      <View
        onLayout={handleComposerLayout}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 2,
          paddingHorizontal: spacing.screen,
          paddingTop: 10,
          paddingBottom: Math.max(insets.bottom, spacing.row),
          backgroundColor: T.bg,
          borderTopWidth: 1,
          borderTopColor: colors.separatorSoft,
        }}
      >
        {focusedItemId ? (
          <View
            style={{
              alignSelf: 'flex-start',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              backgroundColor: T.cardSoft,
              borderRadius: radius.sm,
              paddingHorizontal: 10,
              paddingVertical: 6,
              marginBottom: 10,
            }}
          >
            <SystemIcon name="sparkle" size={12} color={T.accent} strokeWidth={1.9} />
            <Text style={{ ...type.caption, color: T.ink2, flexShrink: 1 }} numberOfLines={1}>
              {t('ask.focusedChip', { name: focusedName ?? t('ask.focusedFallback') })}
            </Text>
            {/* Clear the item focus without leaving the screen. Dropping the
                param flips scope back to global; the scope-change effect
                already resets turns + conversation. */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('ask.focusedClear')}
              onPress={() => navigation.setParams({ focusedItemId: undefined })}
              hitSlop={10}
              style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
            >
              <SystemIcon name="x" size={13} color={T.ink3} strokeWidth={2} />
            </Pressable>
          </View>
        ) : null}
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10 }}>
          <TextInput
            value={input}
            onChangeText={setInput}
            maxLength={2000}
            placeholder={
              focusedItemId ? t('ask.placeholderFocused') : t('ask.v2.placeholder')
            }
            placeholderTextColor={colors.quaternaryLabel}
            multiline
            style={{
              flex: 1,
              maxHeight: 120,
              backgroundColor: T.card,
              borderRadius: radius.lg,
              paddingHorizontal: 14,
              paddingVertical: 12,
              ...type.body,
              // iOS auto-zooms inputs with fontSize < 16; hard-pin to 16 to prevent it.
              fontSize: 16,
              color: T.ink,
              ...shadow.soft,
            }}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('ask.send')}
            onPress={send}
            disabled={input.trim().length === 0 || askMutation.isPending}
            style={{
              width: 46,
              height: 46,
              borderRadius: 23,
              backgroundColor: colors.label,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: input.trim().length === 0 || askMutation.isPending ? 0.42 : 1,
            }}
          >
            <SystemIcon name="chevronRight" size={20} color={colors.inverse} />
          </Pressable>
        </View>
        {!focusedItemId ? (
          <Text
            style={{ ...type.footnote, color: T.ink3, marginTop: 6, textAlign: 'center' }}
          >
            {t('ask.v2.inputHint')}
          </Text>
        ) : null}
      </View>

      <AskHistorySheet
        visible={historyVisible}
        entries={historyQuery.data ?? []}
        loading={historyQuery.isLoading || (historyVisible && historyQuery.isFetching && !historyQuery.data)}
        error={historyQuery.isError && !historyQuery.isFetching}
        onClose={() => setHistoryVisible(false)}
        onRetry={() => void historyQuery.refetch()}
      />

      <ContextualEntrySheet
        visible={contextualSheetVisible}
        onClose={() => setContextualSheetVisible(false)}
        entries={contextualEntries}
      />
    </View>
  );
}
