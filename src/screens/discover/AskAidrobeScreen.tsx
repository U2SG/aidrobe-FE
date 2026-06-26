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
import { useT } from '@/hooks/useT';
import { useTrack } from '@/hooks/useTrack';
import { useWardrobeItemNames } from '@/hooks/useWardrobeItemNames';
import { colors, radius, shadow, spacing, type } from '@/theme/design';
import type { AskHistoryEntry, AskItemRefSnapshot, AskScope } from '@/types/api';
import type { DiscoverStackParamList } from '@/types/navigation';
import { httpStatus } from '@/utils/http';

type Props = NativeStackScreenProps<DiscoverStackParamList, 'AskAidrobe'>;

type Turn = {
  id: string;
  question: string;
  answer: string | null;
  itemRefs: string[];
  itemRefSnapshots: AskItemRefSnapshot[];
  pending: boolean;
  failed?: boolean;
};

const FALLBACK_COMPOSER_HEIGHT = 112;
const HISTORY_LIMIT = 20;

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

function TurnView({ turn, onRetry, retryBusy }: { turn: Turn; onRetry: () => void; retryBusy: boolean }) {
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
          <Text style={{ ...type.caption, color: T.accent, fontWeight: '700', letterSpacing: 0.5 }}>AIDROBE</Text>
        </View>
        {turn.pending ? (
          // AI "thinking" presence — the small vivid orb shares the motion
          // language with the Ask empty state and the import processing wait.
          <View style={{ alignSelf: 'flex-start', marginTop: 2 }}>
            <AIOrb variant="thinking" size="sm" />
          </View>
        ) : (
          <>
            <Text style={{ ...type.body, color: turn.failed ? T.ink3 : T.ink2, lineHeight: 22 }}>
              {turn.answer}
            </Text>
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
  locale,
  onPress,
}: {
  entry: AskHistoryEntry;
  locale: string;
  onPress: () => void;
}) {
  const { t } = useT();
  const answer = entry.answer ?? t('ask.history.answerFallback');
  const date = formatHistoryDate(entry.createdAt, locale);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      android_ripple={{ color: colors.fill }}
      style={({ pressed }) => ({
        backgroundColor: colors.secondaryElevated,
        borderRadius: radius.lg,
        padding: 14,
        borderWidth: 1,
        borderColor: colors.separatorSoft,
        opacity: pressed ? 0.78 : 1,
      })}
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
    </Pressable>
  );
}

function AskHistorySheet({
  visible,
  entries,
  loading,
  error,
  locale,
  onClose,
  onRetry,
}: {
  visible: boolean;
  entries: AskHistoryEntry[];
  loading: boolean;
  error: boolean;
  locale: string;
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
              locale={locale}
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
  const [input, setInput] = useState('');
  const [historyVisible, setHistoryVisible] = useState(false);
  const [composerHeight, setComposerHeight] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

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
    retry: 1,
  });

  // If the scope / focused item changes while the screen stays mounted (e.g.
  // a global Ask tab, then opening Ask from an item-detail CTA), drop the
  // previous scope's live turns so they don't bleed into the new visit.
  useEffect(() => {
    setTurns([]);
  }, [scope, focusedItemId]);

  const askMutation = useMutation({
    mutationFn: (vars: { tempId: string; question: string }) =>
      askAidrobe({
        question: vars.question,
        focusedItemId,
        locale,
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
              }
            : x,
        ),
      );
      track('ask_sent', { scope });
    },
    onError: (err, vars) => {
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

  const send = () => {
    const q = input.trim();
    if (!q || askMutation.isPending) return;
    setInput('');
    askMutation.mutate({ tempId: `local-${Date.now()}`, question: q });
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
    askMutation.mutate({ tempId: turn.id, question: turn.question });
  };

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
    void historyQuery.refetch();
  };

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <ScreenHeader
        title={t('ask.title')}
        onBack={() => navigation.goBack()}
        right={
          <HeaderIconButton
            icon="clock"
            onPress={openHistory}
            accessibilityLabel={t('ask.history.open')}
          />
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
          <View style={{ paddingVertical: 48, alignItems: 'center' }}>
            <AIOrb variant="vivid" size={140} />
            <Text style={{ ...type.headline, color: T.ink, marginTop: 12, textAlign: 'center' }}>
              {t('ask.emptyTitle')}
            </Text>
            <Text style={{ ...type.callout, color: T.ink3, marginTop: 6, textAlign: 'center' }}>
              {t('ask.emptyHint')}
            </Text>
          </View>
        ) : (
          turns.map((turn) => (
            <TurnView
              key={turn.id}
              turn={turn}
              onRetry={() => retryTurn(turn)}
              retryBusy={askMutation.isPending}
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
            <Text style={{ ...type.caption, color: T.ink2 }} numberOfLines={1}>
              {t('ask.focusedChip', { name: focusedName ?? t('ask.focusedFallback') })}
            </Text>
          </View>
        ) : null}
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10 }}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={focusedItemId ? t('ask.placeholderFocused') : t('ask.placeholder')}
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
              color: T.ink,
              ...shadow.soft,
            }}
          />
          <Pressable
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
      </View>

      <AskHistorySheet
        visible={historyVisible}
        entries={historyQuery.data ?? []}
        loading={historyQuery.isLoading || (historyVisible && historyQuery.isFetching && !historyQuery.data)}
        error={historyQuery.isError && !historyQuery.isFetching}
        locale={locale}
        onClose={() => setHistoryVisible(false)}
        onRetry={() => void historyQuery.refetch()}
      />
    </View>
  );
}
