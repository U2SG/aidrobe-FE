import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { FlatList, Image, Pressable, RefreshControl, Text, View } from 'react-native';

import { getInsightsSummary, getTopItems } from '@/api/insights';
import { listWardrobeItems } from '@/api/wardrobe';
import { CutoutBadge } from '@/components/ui/CutoutBadge';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingBlock } from '@/components/feedback/LoadingBlock';
import { GarmentSvg } from '@/components/ui/GarmentSvg';
import { StatusPill } from '@/components/ui/StatusPill';
import { SystemIcon } from '@/components/ui/SystemIcon';
import { WardrobeShowcaseEmpty } from '@/components/wardrobe/WardrobeShowcaseEmpty';
import { useT, type UseT } from '@/hooks/useT';
import { resolveItemDisplayName } from '@/i18n/domainLabels';
import { colors, radius, shadow } from '@/theme/design';
import type { ItemCategory, WardrobeItem } from '@/types/api';
import type { WardrobeStackParamList } from '@/types/navigation';

type Props = NativeStackScreenProps<WardrobeStackParamList, 'WardrobeList'>;

const CATEGORY_KEYS: (ItemCategory | 'all')[] = ['all', 'top', 'bottom', 'outerwear', 'shoes', 'accessory'];

const T = {
  bg: colors.groupedBackground,
  bgAlt: colors.background,
  card: colors.elevated,
  cardSoft: colors.secondaryElevated,
  cardInner: colors.background,
  ink: colors.label,
  ink2: colors.secondaryLabel,
  ink3: colors.tertiaryLabel,
  ink4: colors.quaternaryLabel,
  divider: colors.separator,
  accent: colors.accent,
  ok: colors.success,
  shadowSm: shadow.soft,
  shadowMd: shadow.elevated,
};

function ItemCard({
  item,
  onPress,
  t,
}: {
  item: WardrobeItem;
  onPress: () => void;
  t: UseT;
}) {
  const displayName = resolveItemDisplayName(t.locale, {
    name: item.name,
    nameSource: item.nameSource,
    displayName: item.displayName,
    localizedNames: item.localizedNames,
  });
  return (
    <Pressable onPress={onPress} style={{ flex: 1 }}>
      <View
        style={{
          backgroundColor: T.card,
          borderRadius: radius.lg,
          padding: 12,
          ...T.shadowSm,
          gap: 8,
        }}
      >
        <View
          style={{
            height: 130,
            backgroundColor: T.cardInner,
            borderRadius: radius.md,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {item.imageUrl ? (
            <Image
              source={{ uri: item.imageUrl }}
              style={{ width: '100%', height: '100%', borderRadius: radius.md }}
              resizeMode="contain"
            />
          ) : (
            <GarmentSvg kind={'shirt'} size={90} />
          )}
          {item.cutoutStatus === 'queued' && (
            <CutoutBadge style={{ position: 'absolute', top: 8, left: 8 }} />
          )}
        </View>
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5 }}>
            <Text
              numberOfLines={1}
              style={{ fontSize: 14, fontWeight: '600', color: T.ink, flex: 1 }}
            >
              {displayName}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <StatusPill
              kind={item.status === 'wearable' ? 'ok' : 'warn'}
              label={t.tEnum('status', item.status)}
            />
            <Text style={{ fontSize: 10, color: T.ink4 }}>{item.color}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export function WardrobeListScreen({ navigation }: Props) {
  const t = useT();
  const [category, setCategory] = useState<ItemCategory | 'all'>('all');
  const CATEGORIES = CATEGORY_KEYS.map((key) => ({
    key,
    label: key === 'all' ? t.t('common.all') : t.tEnum('category', key),
  }));
  // Poll while any item is still being cut out; give up after ~90s (the worker's
  // reconcile job will flip stragglers to 'failed' and the original photo stays).
  const pollStartRef = useRef<number | null>(null);
  const query = useQuery({
    queryKey: ['wardrobeItems', category],
    queryFn: () => listWardrobeItems({ category, limit: 50 }),
    retry: 1,
    refetchInterval: (q) => {
      const queued = (q.state.data?.items ?? []).some((it) => it.cutoutStatus === 'queued');
      if (!queued) {
        pollStartRef.current = null;
        return false;
      }
      if (pollStartRef.current == null) pollStartRef.current = Date.now();
      if (Date.now() - pollStartRef.current > 90_000) return false;
      return 4000;
    },
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
      label: t.t('wardrobe.insights.mainColor'),
      value: insightsQuery.data?.favoriteColor ?? '—',
      meta: insightsQuery.data?.activeRate
        ? `${Math.round(insightsQuery.data.activeRate * 100)}%`
        : '',
    },
    {
      label: t.t('wardrobe.insights.mostWorn'),
      value: topItemsQuery.data?.[0]?.name ?? insightsQuery.data?.mostWornCategory ?? '—',
      meta: topItemsQuery.data?.[0]?.wearCount ? `${topItemsQuery.data[0].wearCount}×` : '',
    },
    {
      label: t.t('wardrobe.insights.idle'),
      value: insightsQuery.data
        ? `${insightsQuery.data.idleCount} ${t.t('wardrobe.itemUnit')}`
        : '—',
      meta: insightsQuery.data ? `${insightsQuery.data.idleThresholdDays}d+` : '',
    },
  ];

  const renderItem = ({ item }: { item: WardrobeItem }) => (
    <ItemCard
      item={item}
      t={t}
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
                <Text style={{ fontSize: 30, fontWeight: '600', color: T.ink }}>{t.t('wardrobe.title')}</Text>
                {query.isSuccess && (
                  <View style={{ flexDirection: 'row', gap: 4, marginTop: 8, alignItems: 'center' }}>
                    <Text style={{ fontSize: 13, color: T.ink2 }}>{t.t('wardrobe.stored')} </Text>
                    <Text
                      style={{ fontSize: 18, fontWeight: '600', color: T.accent }}
                    >
                      {total}
                    </Text>
                    <Text style={{ fontSize: 13, color: T.ink2 }}> {t.t('wardrobe.itemUnit')}</Text>
                  </View>
                )}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Pressable
                  onPress={() => navigation.navigate('AddItem')}
                  hitSlop={8}
                  style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}
                >
                  <SystemIcon name="plus" size={24} color={T.ink} />
                </Pressable>
                {/* Bell icon */}
                <View style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}>
                  <SystemIcon name="bell" size={22} color={T.ink2} />
                </View>
              </View>
            </View>

            {/* Search bar */}
            <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 4 }}>
              <View
                style={{
                  flex: 1,
                  height: 44,
                  backgroundColor: T.card,
                  borderRadius: radius.md,
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 14,
                  gap: 10,
                  ...T.shadowSm,
                }}
              >
                <SystemIcon name="search" size={17} color={T.ink3} />
                <Text style={{ color: T.ink4, fontSize: 14 }}>{t.t('wardrobe.searchPlaceholder')}</Text>
              </View>
              <Pressable
                style={{
                  width: 80,
                  height: 44,
                  backgroundColor: T.card,
                  borderRadius: radius.md,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 7,
                  ...T.shadowSm,
                }}
              >
                <SystemIcon name="slider" size={16} color={T.ink2} />
                <Text style={{ fontSize: 13, color: T.ink2, fontWeight: '600' }}>{t.t('wardrobe.filter')}</Text>
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
                    borderRadius: radius.pill,
                    backgroundColor: category === cat.key ? T.ink : 'transparent',
                    borderWidth: 1,
                    borderColor: category === cat.key ? T.ink : T.divider,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: category === cat.key ? '600' : '500',
                      color: category === cat.key ? colors.inverse : T.ink2,
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
                  <SystemIcon name="chart" size={18} color={T.ink2} />
                  <Text style={{ fontSize: 14, fontWeight: '600', color: T.ink }}>{t.t('wardrobe.insights')}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                  <Text style={{ fontSize: 11, color: T.ink3 }}>{t.t('common.viewAll')}</Text>
                  <SystemIcon name="chevronRight" size={13} color={T.ink3} />
                </View>
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
            <WardrobeShowcaseEmpty
              onAddItem={() => navigation.navigate('AddItem')}
              onOpenItem={(id) => navigation.navigate('ItemDetail', { itemId: id })}
            />
          )
        }
      />
    </View>
  );
}
