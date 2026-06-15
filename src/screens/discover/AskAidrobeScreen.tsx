import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQueries, useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { askAidrobe, getAskHistory } from '@/api/ask';
import { getWardrobeItem } from '@/api/wardrobe';
import { SystemIcon } from '@/components/ui/SystemIcon';
import { useTrack } from '@/hooks/useTrack';
import { colors, radius, shadow, spacing, type } from '@/theme/design';
import type { DiscoverStackParamList } from '@/types/navigation';

type Props = NativeStackScreenProps<DiscoverStackParamList, 'AskAidrobe'>;

type Turn = {
  id: string;
  question: string;
  answer: string | null;
  itemRefs: string[];
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

function statusCode(err: unknown): number | undefined {
  return (err as { response?: { status?: number } })?.response?.status;
}

function ItemRefsRow({ ids }: { ids: string[] }) {
  const queries = useQueries({
    queries: ids.map((iid) => ({
      queryKey: ['wardrobeItem', iid],
      queryFn: () => getWardrobeItem(iid),
      staleTime: 5 * 60 * 1000,
    })),
  });
  if (ids.length === 0) return null;
  return (
    <View style={{ marginTop: 10 }}>
      <Text style={{ ...type.caption, color: T.ink3, marginBottom: 6 }}>衣橱里的相关单品</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
        {ids.map((iid, i) => (
          <View key={iid} style={{ width: 60 }}>
            <View style={{ width: 60, height: 60, borderRadius: radius.sm, backgroundColor: T.cardSoft }} />
            <Text style={{ ...type.caption, color: T.ink2, marginTop: 4 }} numberOfLines={1}>
              {queries[i]?.data?.name ?? '单品'}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function TurnView({ turn }: { turn: Turn }) {
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
          <ActivityIndicator color={T.accent} style={{ alignSelf: 'flex-start', marginTop: 6 }} />
        ) : (
          <>
            <Text style={{ ...type.body, color: turn.failed ? T.ink3 : T.ink2, lineHeight: 22 }}>
              {turn.answer}
            </Text>
            {!turn.failed ? <ItemRefsRow ids={turn.itemRefs} /> : null}
          </>
        )}
      </View>
    </View>
  );
}

export function AskAidrobeScreen({ navigation }: Props) {
  const track = useTrack();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState('');
  const seededRef = useRef(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    track('ask_viewed', {});
  }, [track]);

  const historyQuery = useQuery({ queryKey: ['askHistory'], queryFn: () => getAskHistory(20), retry: 1 });

  useEffect(() => {
    if (!seededRef.current && historyQuery.data) {
      seededRef.current = true;
      setTurns(
        [...historyQuery.data].reverse().map((h) => ({
          id: h.askSessionId,
          question: h.question,
          answer: h.answer ?? null,
          itemRefs: h.itemRefs,
          pending: false,
        })),
      );
    }
  }, [historyQuery.data]);

  const askMutation = useMutation({
    mutationFn: (vars: { tempId: string; question: string }) =>
      askAidrobe({ question: vars.question, context: { scene: 'commute' } }),
    onMutate: (vars) => {
      setTurns((t) => [
        ...t,
        { id: vars.tempId, question: vars.question, answer: null, itemRefs: [], pending: true },
      ]);
    },
    onSuccess: (result, vars) => {
      setTurns((t) =>
        t.map((x) =>
          x.id === vars.tempId
            ? { id: result.askSessionId, question: x.question, answer: result.answer, itemRefs: result.itemRefs, pending: false }
            : x,
        ),
      );
      track('ask_sent', {});
    },
    onError: (err, vars) => {
      const code = statusCode(err);
      setTurns((t) =>
        t.map((x) =>
          x.id === vars.tempId
            ? {
                ...x,
                pending: false,
                failed: true,
                answer: code === 503 ? '问答功能正在接入中，稍后再试。' : '出错了，请稍后再试。',
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

  const isEmpty = useMemo(() => turns.length === 0, [turns]);

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      {/* Header */}
      <View
        style={{
          paddingTop: 52,
          paddingHorizontal: 16,
          paddingBottom: 8,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <Pressable
          onPress={() => navigation.goBack()}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: T.card,
            alignItems: 'center',
            justifyContent: 'center',
            ...shadow.soft,
          }}
        >
          <SystemIcon name="chevronLeft" size={18} color={T.ink} />
        </Pressable>
        <Text style={{ ...type.title2, color: T.ink }}>问 Aidrobe</Text>
      </View>

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
            <SystemIcon name="sparkle" size={28} color={T.accent} strokeWidth={1.8} />
            <Text style={{ ...type.headline, color: T.ink, marginTop: 12, textAlign: 'center' }}>
              问问你的衣橱
            </Text>
            <Text style={{ ...type.callout, color: T.ink3, marginTop: 6, textAlign: 'center' }}>
              比如「明天通勤穿什么」「这件配什么鞋」
            </Text>
          </View>
        ) : (
          turns.map((turn) => <TurnView key={turn.id} turn={turn} />)
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
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10 }}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="问问搭配…"
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
