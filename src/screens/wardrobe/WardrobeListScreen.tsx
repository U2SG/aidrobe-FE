import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { FlatList, Image, Pressable, RefreshControl, Text, View } from 'react-native';

import { getInsightsSummary, getTopItems } from '@/api/insights';
import { listWardrobeItems } from '@/api/wardrobe';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingBlock } from '@/components/feedback/LoadingBlock';
import { GarmentSvg } from '@/components/ui/GarmentSvg';
import { StatusPill } from '@/components/ui/StatusPill';
import type { ItemCategory, WardrobeItem } from '@/types/api';
import type { WardrobeStackParamList } from '@/types/navigation';

type Props = NativeStackScreenProps<WardrobeStackParamList, 'WardrobeList'>;

const T = {
  bg: '#F5EFE6',
  bgAlt: '#FAF6EE',
  card: '#FFFFFF',
  cardSoft: '#F8F3E9',
  cardInner: '#FBF7EF',
  ink: '#1A1714',
  ink2: '#3A332B',
  ink3: '#807468',
  ink4: '#B8AC9D',
  divider: '#EBE3D5',
  accent: '#B08D5B',
  ok: '#7A9B6E',
  shadowSm: {
    shadowColor: '#3C2814',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  } as const,
  shadowMd: {
    shadowColor: '#3C2814',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 4,
  } as const,
};

const CATEGORIES: { key: ItemCategory | 'all'; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'top', label: '上衣' },
  { key: 'bottom', label: '下装' },
  { key: 'outerwear', label: '外套' },
  { key: 'shoes', label: '鞋' },
  { key: 'accessory', label: '可穿' },
];

function ItemCard({
  item,
  onPress,
}: {
  item: WardrobeItem;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={{ flex: 1 }}>
      <View
        style={{
          backgroundColor: T.card,
          borderRadius: 18,
          padding: 12,
          ...T.shadowSm,
          gap: 8,
        }}
      >
        <View
          style={{
            height: 130,
            backgroundColor: T.cardInner,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {item.imageUrl ? (
            <Image
              source={{ uri: item.imageUrl }}
              style={{ width: '100%', height: '100%', borderRadius: 12 }}
              resizeMode="contain"
            />
          ) : (
            <GarmentSvg kind={'shirt'} size={90} />
          )}
        </View>
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5 }}>
            <Text
              numberOfLines={1}
              style={{ fontSize: 14, fontWeight: '600', color: T.ink, flex: 1 }}
            >
              {item.name}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <StatusPill kind={item.status === 'wearable' ? 'ok' : 'warn'} />
            <Text style={{ fontSize: 10, color: T.ink4 }}>{item.color}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export function WardrobeListScreen({ navigation }: Props) {
  const [category, setCategory] = useState<ItemCategory | 'all'>('all');
  const query = useQuery({
    queryKey: ['wardrobeItems', category],
    queryFn: () => listWardrobeItems({ category, limit: 50 }),
    retry: 1,
  });

  const insightsQuery = useQuery({
    queryKey: ['insightsSummary'],
    queryFn: getInsightsSummary,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const topItemsQuery = useQuery({
    queryKey: ['topItems'],
    queryFn: () => getTopItems(1),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const total = query.data?.total ?? 0;
  const insightChips = [
    {
      label: '主色调',
      value: insightsQuery.data?.favoriteColor ?? '—',
      meta: insightsQuery.data?.activeRate
        ? `${Math.round(insightsQuery.data.activeRate * 100)}%`
        : '',
    },
    {
      label: '最常穿',
      value: topItemsQuery.data?.[0]?.name ?? insightsQuery.data?.mostWornCategory ?? '—',
      meta: topItemsQuery.data?.[0]?.wearCount ? `${topItemsQuery.data[0].wearCount}×` : '',
    },
    {
      label: '闲置',
      value: insightsQuery.data ? `${insightsQuery.data.idleCount} 件` : '—',
      meta: insightsQuery.data ? `${insightsQuery.data.idleThresholdDays}d+` : '',
    },
  ];

  const renderItem = ({ item }: { item: WardrobeItem }) => (
    <ItemCard
      item={item}
      onPress={() => navigation.navigate('ItemDetail', { itemId: item.id })}
    />
  );

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <FlatList
        ListHeaderComponent={
          <View style={{ paddingTop: 52 }}>
            {/* Header */}
            <View
              style={{
                paddingHorizontal: 24,
                paddingBottom: 0,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
              }}
            >
              <View>
                <Text style={{ fontSize: 30, fontWeight: '600', color: T.ink }}>我的衣橱</Text>
                {query.isSuccess && (
                  <View style={{ flexDirection: 'row', gap: 4, marginTop: 8, alignItems: 'center' }}>
                    <Text style={{ fontSize: 13, color: T.ink2 }}>已收纳 </Text>
                    <Text
                      style={{ fontSize: 18, fontWeight: '600', color: T.accent }}
                    >
                      {total}
                    </Text>
                    <Text style={{ fontSize: 13, color: T.ink2 }}> 件</Text>
                  </View>
                )}
              </View>
              {/* Bell icon */}
              <View style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 22 }}>🔔</Text>
              </View>
            </View>

            {/* Search bar */}
            <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 4 }}>
              <View
                style={{
                  flex: 1,
                  height: 44,
                  backgroundColor: T.card,
                  borderRadius: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 14,
                  gap: 10,
                  ...T.shadowSm,
                }}
              >
                <Text style={{ fontSize: 14 }}>🔍</Text>
                <Text style={{ color: T.ink4, fontSize: 14 }}>搜索衣物 · 颜色 · 品类</Text>
              </View>
              <Pressable
                style={{
                  width: 80,
                  height: 44,
                  backgroundColor: T.card,
                  borderRadius: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  ...T.shadowSm,
                }}
              >
                <Text style={{ fontSize: 13, color: T.ink2 }}>☰ 筛选</Text>
              </Pressable>
            </View>

            {/* Category chips */}
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={CATEGORIES}
              keyExtractor={(item) => item.key}
              contentContainerStyle={{ gap: 8, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 6 }}
              renderItem={({ item: cat }) => (
                <Pressable
                  onPress={() => setCategory(cat.key)}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 999,
                    backgroundColor: category === cat.key ? T.ink : 'transparent',
                    borderWidth: 1,
                    borderColor: category === cat.key ? T.ink : T.divider,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: category === cat.key ? '600' : '500',
                      color: category === cat.key ? '#fff' : T.ink2,
                    }}
                  >
                    {cat.label}
                  </Text>
                </Pressable>
              )}
            />

            {/* Insight banner */}
            <Pressable
              style={{
                marginHorizontal: 20,
                marginTop: 14,
                padding: 14,
                backgroundColor: T.cardSoft,
                borderRadius: 16,
                gap: 10,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 16 }}>📈</Text>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: T.ink }}>本周穿搭洞察</Text>
                </View>
                <Text style={{ fontSize: 11, color: T.ink3 }}>查看全部 ›</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {insightChips.map((chip, i) => (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      padding: 10,
                      backgroundColor: T.card,
                      borderRadius: 14,
                      gap: 4,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                      <Text style={{ fontSize: 11, color: T.ink3 }}>{chip.label}</Text>
                      {!!chip.meta && (
                        <Text style={{ fontSize: 10, color: T.ink3 }}>{chip.meta}</Text>
                      )}
                    </View>
                    <Text
                      numberOfLines={1}
                      style={{ fontSize: 14, fontWeight: '600', color: T.ink }}
                    >
                      {chip.value}
                    </Text>
                  </View>
                ))}
              </View>
            </Pressable>

            <View style={{ height: 14 }} />
          </View>
        }
        data={query.data?.items ?? []}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={{ gap: 12, marginBottom: 12, paddingHorizontal: 20 }}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} />
        }
        renderItem={renderItem}
        ListEmptyComponent={
          query.isLoading ? (
            <LoadingBlock />
          ) : query.isError ? (
            <ErrorState onRetry={() => query.refetch()} />
          ) : (
            <EmptyState
              title="衣橱还是空的"
              description="拍一张衣物照片，开始组建你的私人衣橱。"
              ctaLabel="添加衣物"
              onCtaPress={() => navigation.navigate('AddItem')}
            />
          )
        }
      />
    </View>
  );
}
