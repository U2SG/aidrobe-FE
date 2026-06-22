import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { askAidrobe, getAskHistory } from '@/api/ask';
import { InlineRetry } from '@/components/feedback/InlineRetry';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { AIOrb } from '@/components/ui/AIOrb';
import { SystemIcon } from '@/components/ui/SystemIcon';
import { ItemRefsRow } from '@/components/wardrobe/ItemRefsRow';
import { useT } from '@/hooks/useT';
import { useTrack } from '@/hooks/useTrack';
import { useWardrobeItemNames } from '@/hooks/useWardrobeItemNames';
import { colors, radius, shadow, spacing, type } from '@/theme/design';
import type { AskItemRefSnapshot, AskScope } from '@/types/api';
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

const T = {
  bg: colors.groupedBackground,
  card: colors.elevated,
  cardSoft: colors.secondaryElevated,
  ink: colors.label,
  ink2: colors.secondaryLabel,
  ink3: colors.tertiaryLabel,
  accent: colors.accent,
};

function TurnView({ turn, onRetry, retryBusy }: { turn: Turn; onRetry: () => void; retryBusy: boolean }) {
  return (
    <View style={{ gap: 10 }}>
      {/* Question bubble */}
      <View style={{ alignSelf: 'flex-end', maxWidth: '82%', backgroundColor: colors.label, borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 10 }}>
        <Text style={{ ...type.body, color: colors.inverse }}>{turn.question}</Text>
      </View>
      {/* Answer card */}
      <View style={{ alignSelf: 'flex-start', maxWidth: '92%', backgroundColor: T.card, borderRadius: radius.lg, padding: 14, ...shadow.soft }}>
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

export function AskAidrobeScreen({ navigation, route }: Props) {
  const { t, locale } = useT();
  const track = useTrack();
  const focusedItemId = route.params?.focusedItemId;
  // Scope derives from the entrypoint: focused item → 'item', explicit today
  // param → 'today', otherwise global discover. No forced scene anymore.
  const scope: AskScope = focusedItemId ? 'item' : route.params?.scope === 'today' ? 'today' : 'global';
  const focusedNames = useWardrobeItemNames(focusedItemId ? [focusedItemId] : []);
  const focusedName = focusedItemId ? focusedNames.get(focusedItemId) : undefined;
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState('');
  const seededRef = useRef(false);
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
        limit: 20,
        focusedItemId,
        scope: focusedItemId ? 'item' : undefined,
        entrypoint: focusedItemId ? 'item_detail' : undefined,
      }),
    retry: 1,
  });

  // If the scope / focused item changes while the screen stays mounted (e.g.
  // a global Ask tab, then opening Ask from an item-detail CTA), the history
  // query refetches for the new key — re-arm the one-time seed guard and drop
  // the previous scope's turns so they don't bleed into the new view.
  useEffect(() => {
    seededRef.current = false;
    setTurns([]);
  }, [scope, focusedItemId]);

  useEffect(() => {
    if (!seededRef.current && historyQuery.data) {
      seededRef.current = true;
      setTurns(
        [...historyQuery.data].reverse().map((h) => ({
          id: h.askSessionId,
          question: h.question,
          answer: h.answer,
          itemRefs: h.itemRefs,
          itemRefSnapshots: h.itemRefSnapshots,
          pending: false,
        })),
      );
    }
  }, [historyQuery.data]);

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

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <ScreenHeader title={t('ask.title')} onBack={() => navigation.goBack()} />

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: spacing.screen, paddingTop: 8, paddingBottom: 16, gap: 16 }}
        showsVerticalScrollIndicator={false}
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
        style={{
          paddingHorizontal: spacing.screen,
          paddingTop: 10,
          paddingBottom: 28,
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
    </View>
  );
}
