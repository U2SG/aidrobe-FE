import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQueries, useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { getPackingList } from '@/api/packingList';
import { getWardrobeItem } from '@/api/wardrobe';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingBlock } from '@/components/feedback/LoadingBlock';
import { SystemIcon } from '@/components/ui/SystemIcon';
import { Tag } from '@/components/ui/Tag';
import { colors, radius, shadow, spacing, type } from '@/theme/design';
import type { PackingEntry } from '@/types/api';
import type { DiscoverStackParamList } from '@/types/navigation';

type Props = NativeStackScreenProps<DiscoverStackParamList, 'PackingListDetail'>;

const T = {
  bg: colors.groupedBackground,
  card: colors.elevated,
  cardSoft: colors.secondaryElevated,
  ink: colors.label,
  ink2: colors.secondaryLabel,
  ink3: colors.tertiaryLabel,
  accent: colors.accent,
  ok: colors.success,
  divider: colors.separator,
};

const SCENE_LABEL: Record<string, string> = {
  commute: '通勤',
  business: '商务',
  casual: '休闲',
  travel: '旅行',
  date: '约会',
  formal: '正式',
};

export function PackingListDetailScreen({ navigation, route }: Props) {
  const { id } = route.params;
  // v1: per-item "packed" check is local-only (backend PackingItem has no
  // packed field — see docs/v4-ui/08-backend-gaps.md #3).
  const [checked, setChecked] = useState<Set<number>>(new Set());

  const query = useQuery({ queryKey: ['packingList', id], queryFn: () => getPackingList(id), retry: 1 });
  const list = query.data;

  const itemIds = useMemo(
    () => [...new Set((list?.items ?? []).map((it) => it.itemId))],
    [list],
  );
  const itemQueries = useQueries({
    queries: itemIds.map((iid) => ({
      queryKey: ['wardrobeItem', iid],
      queryFn: () => getWardrobeItem(iid),
      staleTime: 5 * 60 * 1000,
    })),
  });
  const nameById = useMemo(() => {
    const m = new Map<string, string>();
    itemQueries.forEach((q, i) => {
      const iid = itemIds[i];
      if (iid && q.data) m.set(iid, q.data.name);
    });
    return m;
  }, [itemQueries, itemIds]);

  // Group entries (with their original index) by day.
  const byDay = useMemo(() => {
    const groups = new Map<number, { entry: PackingEntry; index: number }[]>();
    (list?.items ?? []).forEach((entry, index) => {
      const arr = groups.get(entry.day) ?? [];
      arr.push({ entry, index });
      groups.set(entry.day, arr);
    });
    return [...groups.entries()].sort((a, b) => a[0] - b[0]);
  }, [list]);

  const total = list?.items.length ?? 0;

  const toggle = (index: number) =>
    setChecked((cur) => {
      const next = new Set(cur);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });

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
        <Text style={{ ...type.title2, color: T.ink }} numberOfLines={1}>
          {list?.destination || '打包清单'}
        </Text>
      </View>

      {query.isLoading ? (
        <LoadingBlock label="加载中…" />
      ) : query.isError ? (
        <ErrorState onRetry={() => query.refetch()} />
      ) : list ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: spacing.screen, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Summary */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginBottom: 6 }}>
            {list.days ? <Tag dark>{`${list.days} 天`}</Tag> : null}
            {list.scenes.map((s) => (
              <Tag key={s}>{SCENE_LABEL[s] ?? s}</Tag>
            ))}
          </View>
          <Text style={{ ...type.footnote, color: T.ink3, marginBottom: 16 }}>
            已打包 {checked.size} / {total}
          </Text>

          {byDay.map(([day, entries]) => (
            <View key={day} style={{ marginBottom: 18 }}>
              <Text style={{ ...type.headline, color: T.ink, marginBottom: 10 }}>Day {day}</Text>
              <View style={{ gap: 10 }}>
                {entries.map(({ entry, index }) => {
                  const isChecked = checked.has(index);
                  return (
                    <Pressable
                      key={index}
                      onPress={() => toggle(index)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 12,
                        backgroundColor: T.card,
                        borderRadius: radius.lg,
                        padding: 12,
                        opacity: isChecked ? 0.6 : 1,
                        ...shadow.soft,
                      }}
                    >
                      <View
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 12,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: isChecked ? T.ok : 'transparent',
                          borderWidth: isChecked ? 0 : 1.5,
                          borderColor: T.divider,
                        }}
                      >
                        {isChecked ? <SystemIcon name="check" size={14} color={colors.inverse} /> : null}
                      </View>
                      <View style={{ width: 40, height: 40, borderRadius: radius.sm, backgroundColor: T.cardSoft }} />
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            ...type.body,
                            color: T.ink,
                            textDecorationLine: isChecked ? 'line-through' : 'none',
                          }}
                          numberOfLines={1}
                        >
                          {nameById.get(entry.itemId) ?? '衣橱单品'}
                        </Text>
                        {entry.notes ? (
                          <Text style={{ ...type.caption, color: T.ink3, marginTop: 2 }} numberOfLines={1}>
                            {entry.notes}
                          </Text>
                        ) : null}
                      </View>
                      <Tag>{SCENE_LABEL[entry.scene] ?? entry.scene}</Tag>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}
