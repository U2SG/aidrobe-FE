import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { createOutfitPlan } from '@/api/outfitPlan';
import { getOutfitHistory } from '@/api/outfitHistory';
import { getTodayRecommendation } from '@/api/recommendations';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingBlock } from '@/components/feedback/LoadingBlock';
import { PrimaryButton } from '@/components/forms/PrimaryButton';
import { SystemIcon } from '@/components/ui/SystemIcon';
import { useTrack } from '@/hooks/useTrack';
import { useToastStore } from '@/store/toast';
import { colors, radius, shadow, spacing, type } from '@/theme/design';
import type { TodayStackParamList } from '@/types/navigation';
import { httpStatus } from '@/utils/http';
import { formatMonthDay } from '@/utils/date';

type Props = NativeStackScreenProps<TodayStackParamList, 'OutfitPlanPicker'>;

type PickItem = { outfitId: string; title: string; subtitle: string };

const T = {
  bg: colors.groupedBackground,
  card: colors.elevated,
  ink: colors.label,
  ink2: colors.secondaryLabel,
  ink3: colors.tertiaryLabel,
  accent: colors.accent,
  divider: colors.separator,
};

function Segmented({
  value,
  onChange,
}: {
  value: 'today' | 'history';
  onChange: (v: 'today' | 'history') => void;
}) {
  const tabs: { id: 'today' | 'history'; label: string }[] = [
    { id: 'today', label: '今日推荐' },
    { id: 'history', label: '历史搭配' },
  ];
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: colors.secondaryElevated,
        borderRadius: radius.pill,
        padding: 4,
      }}
    >
      {tabs.map((t) => {
        const active = value === t.id;
        return (
          <Pressable
            key={t.id}
            onPress={() => onChange(t.id)}
            style={{
              flex: 1,
              paddingVertical: 9,
              borderRadius: radius.pill,
              alignItems: 'center',
              backgroundColor: active ? colors.elevated : 'transparent',
              ...(active ? shadow.soft : {}),
            }}
          >
            <Text style={{ ...type.footnote, fontWeight: active ? '700' : '500', color: active ? T.ink : T.ink3 }}>
              {t.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function OutfitRow({
  item,
  selected,
  onPress,
}: {
  item: PickItem;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: T.card,
        borderRadius: radius.lg,
        padding: 14,
        borderWidth: 1.5,
        borderColor: selected ? T.accent : 'transparent',
        ...shadow.soft,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ ...type.headline, color: T.ink }} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={{ ...type.footnote, color: T.ink3, marginTop: 3 }} numberOfLines={1}>
          {item.subtitle}
        </Text>
      </View>
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: selected ? T.accent : 'transparent',
          borderWidth: selected ? 0 : 1.5,
          borderColor: T.divider,
        }}
      >
        {selected ? <SystemIcon name="check" size={14} color={colors.inverse} /> : null}
      </View>
    </Pressable>
  );
}

export function OutfitPlanPickerScreen({ navigation, route }: Props) {
  const { plannedDate } = route.params;
  const qc = useQueryClient();
  const track = useTrack();
  const showToast = useToastStore((s) => s.show);
  const [tab, setTab] = useState<'today' | 'history'>('today');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const todayQuery = useQuery({
    queryKey: ['todayRecommendation'],
    queryFn: () => getTodayRecommendation('commute'),
    staleTime: 60 * 1000,
    retry: 1,
    enabled: tab === 'today',
  });

  const historyQuery = useQuery({
    queryKey: ['outfitHistory', 'picker'],
    queryFn: () => getOutfitHistory({ limit: 40 }),
    staleTime: 5 * 60 * 1000,
    retry: 1,
    enabled: tab === 'history',
  });

  const items: PickItem[] = useMemo(() => {
    if (tab === 'today') {
      return (todayQuery.data?.outfits ?? []).map((o) => ({
        outfitId: o.id,
        title: o.title,
        subtitle: o.reason || '今日推荐搭配',
      }));
    }
    return (historyQuery.data?.items ?? []).map((e) => ({
      outfitId: e.outfitId,
      title: e.title,
      subtitle: `穿于 ${formatMonthDay(e.wornDate)}`,
    }));
  }, [tab, todayQuery.data, historyQuery.data]);

  const createMutation = useMutation({
    mutationFn: (outfitId: string) => createOutfitPlan({ outfitId, plannedDate }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['outfitCalendar'] });
      showToast({ message: `已计划到 ${formatMonthDay(plannedDate)}`, kind: 'success' });
      track('outfit_plan_created', { plannedDate });
      navigation.goBack();
    },
    onError: (err: unknown) => {
      if (httpStatus(err) === 409) {
        showToast({ message: '这套搭配已计划在该日期', kind: 'error' });
      }
      // Other errors handled by the axios interceptor.
    },
  });

  const activeQuery = tab === 'today' ? todayQuery : historyQuery;

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      {/* Modal header */}
      <View
        style={{
          paddingTop: 16,
          paddingHorizontal: 16,
          paddingBottom: 8,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View>
          <Text style={{ ...type.title2, color: T.ink }}>计划穿搭</Text>
          <Text style={{ ...type.footnote, color: T.ink3, marginTop: 2 }}>
            计划到 {formatMonthDay(plannedDate)}
          </Text>
        </View>
        <Pressable
          onPress={() => navigation.goBack()}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: T.card,
            alignItems: 'center',
            justifyContent: 'center',
            ...shadow.soft,
          }}
        >
          <SystemIcon name="x" size={16} color={T.ink} />
        </Pressable>
      </View>

      <View style={{ paddingHorizontal: spacing.screen, paddingTop: 8 }}>
        <Segmented value={tab} onChange={setTab} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing.screen, gap: 12, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {activeQuery.isLoading ? (
          <LoadingBlock label="加载中…" />
        ) : activeQuery.isError ? (
          <ErrorState onRetry={() => activeQuery.refetch()} />
        ) : items.length === 0 ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <Text style={{ ...type.callout, color: T.ink3, textAlign: 'center' }}>
              {tab === 'today' ? '今日还没有推荐搭配' : '还没有穿着记录'}
            </Text>
          </View>
        ) : (
          items.map((item) => (
            <OutfitRow
              key={item.outfitId}
              item={item}
              selected={selectedId === item.outfitId}
              onPress={() => setSelectedId(item.outfitId)}
            />
          ))
        )}
      </ScrollView>

      <View
        style={{
          paddingHorizontal: spacing.screen,
          paddingTop: 12,
          paddingBottom: 28,
          backgroundColor: T.bg,
          borderTopWidth: 1,
          borderTopColor: colors.separatorSoft,
        }}
      >
        <PrimaryButton
          label={`计划到 ${formatMonthDay(plannedDate)}`}
          onPress={() => selectedId && createMutation.mutate(selectedId)}
          disabled={!selectedId}
          loading={createMutation.isPending}
        />
      </View>
    </View>
  );
}
