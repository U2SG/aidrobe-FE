import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { listPackingLists } from '@/api/packingList';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingBlock } from '@/components/feedback/LoadingBlock';
import { HeaderIconButton, ScreenHeader } from '@/components/layout/ScreenHeader';
import { Tag } from '@/components/ui/Tag';
import { useTrack } from '@/hooks/useTrack';
import { colors, radius, shadow, spacing, type } from '@/theme/design';
import type { PackingList } from '@/types/api';
import type { DiscoverStackParamList } from '@/types/navigation';
import { httpStatus } from '@/utils/http';

type Props = NativeStackScreenProps<DiscoverStackParamList, 'PackingList'>;

const T = {
  bg: colors.groupedBackground,
  card: colors.elevated,
  cardSoft: colors.secondaryElevated,
  ink: colors.label,
  ink2: colors.secondaryLabel,
  ink3: colors.tertiaryLabel,
  accent: colors.accent,
};

const STATUS_LABEL: Record<string, string> = {
  draft: '草稿',
  active: '进行中',
  archived: '已归档',
};

function ListCard({ list, onPress }: { list: PackingList; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{ backgroundColor: T.card, borderRadius: radius.xl, padding: 16, ...shadow.soft }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ ...type.headline, color: T.ink }} numberOfLines={1}>
          {list.destination || '未命名行程'}
        </Text>
        <Text style={{ ...type.caption, color: T.accent, fontWeight: '700' }}>
          {STATUS_LABEL[list.status] ?? list.status}
        </Text>
      </View>
      <Text style={{ ...type.footnote, color: T.ink3, marginTop: 4 }}>
        {list.days ? `${list.days} 天` : '行程'} · {list.items.length} 件
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
        {list.scenes.map((s) => (
          <Tag key={s}>{s}</Tag>
        ))}
      </View>
    </Pressable>
  );
}

export function PackingListScreen({ navigation }: Props) {
  const track = useTrack();
  useEffect(() => {
    track('packing_list_viewed', {});
  }, [track]);

  const query = useQuery({ queryKey: ['packingLists'], queryFn: listPackingLists, retry: 1 });

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <ScreenHeader
        title="打包清单"
        onBack={() => navigation.goBack()}
        right={
          <HeaderIconButton icon="plus" dark onPress={() => navigation.navigate('CreatePackingList')} />
        }
      />

      {query.isLoading ? (
        <LoadingBlock label="加载中…" />
      ) : query.isError ? (
        httpStatus(query.error) === 503 ? (
          <EmptyState title="打包清单尚未开放" description="该功能正在准备中，稍后回来试试。" />
        ) : (
          <ErrorState onRetry={() => query.refetch()} />
        )
      ) : (query.data ?? []).length === 0 ? (
        <EmptyState
          title="还没有打包清单"
          description="按天数和场景，从衣橱快速生成一份"
          ctaLabel="新建打包清单"
          onCtaPress={() => navigation.navigate('CreatePackingList')}
        />
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: spacing.screen, paddingBottom: 100, gap: 12 }}
          showsVerticalScrollIndicator={false}
        >
          {(query.data ?? []).map((list) => (
            <ListCard
              key={list.id}
              list={list}
              onPress={() => navigation.navigate('PackingListDetail', { id: list.id })}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}
