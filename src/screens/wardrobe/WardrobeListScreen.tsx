import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { getInsightsSummary } from '@/api/insights';
import { listWardrobeItems } from '@/api/wardrobe';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { CutoutBadge } from '@/components/ui/CutoutBadge';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingBlock } from '@/components/feedback/LoadingBlock';
import { GarmentSvg } from '@/components/ui/GarmentSvg';
import { StatusPill } from '@/components/ui/StatusPill';
import { SystemIcon } from '@/components/ui/SystemIcon';
import { Tag } from '@/components/ui/Tag';
import { WardrobeShowcaseEmpty } from '@/components/wardrobe/WardrobeShowcaseEmpty';
import { useT, type UseT } from '@/hooks/useT';
import { enableMvpV2Ui } from '@/lib/featureFlags';
import { resolveItemDisplayName, SEASON_VALUES, tColorFilterLabel } from '@/i18n/domainLabels';
import { colors, radius, shadow } from '@/theme/design';
import type { ItemCategory, ItemStatus, WardrobeItem } from '@/types/api';
import type { MainTabsParamList, WardrobeStackParamList } from '@/types/navigation';

type Props = NativeStackScreenProps<WardrobeStackParamList, 'WardrobeList'>;
type MainTabsNavigation = BottomTabNavigationProp<MainTabsParamList>;

const CATEGORY_KEYS: (ItemCategory | 'all')[] = [
  'all',
  'top',
  'bottom',
  'outerwear',
  'dress',
  'shoes',
  'accessory',
  'other',
];
const STATUS_KEYS: ItemStatus[] = ['wearable', 'dirty', 'unavailable', 'lost', 'donated'];

interface FilterValues {
  status: ItemStatus | 'all';
  season: string | 'all';
  color: string | 'all';
}

const DEFAULT_FILTERS: FilterValues = {
  status: 'all',
  season: 'all',
  color: 'all',
};

const T = {
  bg: colors.background,
  bgAlt: colors.background,
  card: colors.elevated,
  cardSoft: colors.secondaryElevated,
  cardInner: colors.groupedBackground,
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

/** Days between an ISO date string and today; null if date is falsy or invalid. */
function daysSince(isoDate: string | null | undefined): number | null {
  if (!isoDate) return null;
  const parts = isoDate.split('-').map(Number);
  if (parts.length < 3) return null;
  const [y, m, d] = parts;
  const then = new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
  if (isNaN(then.getTime())) return null;
  const now = new Date();
  const msPerDay = 86400000;
  return Math.max(0, Math.floor((now.getTime() - then.getTime()) / msPerDay));
}

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

  // Meta line: status dot + label, or wear-record text when available.
  // Rule: if lastWorn is present and item is wearable, show wear-record copy.
  // Otherwise show wearable/unavailable status via StatusPill.
  const wearDays = daysSince(item.lastWorn);
  const showWearRecord = item.status === 'wearable' && wearDays !== null;
  const IDLE_THRESHOLD_DAYS = 30;
  const wearMeta =
    showWearRecord && wearDays !== null
      ? wearDays >= IDLE_THRESHOLD_DAYS
        ? t.t('wardrobe.item.notWornDays', { days: String(wearDays) })
        : t.t('wardrobe.item.wornDaysAgo', { days: String(wearDays) })
      : null;

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
          <Text
            numberOfLines={1}
            style={{ fontSize: 14, fontWeight: '600', color: T.ink, marginBottom: 5 }}
          >
            {displayName}
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            {wearMeta ? (
              <Text style={{ fontSize: 11, color: T.ink3 }}>{wearMeta}</Text>
            ) : (
              <StatusPill
                kind={item.status === 'wearable' ? 'ok' : 'warn'}
                label={t.tEnum('status', item.status)}
              />
            )}
            <Pressable
              hitSlop={8}
              onPress={onPress}
              style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}
            >
              <SystemIcon name="more" size={16} color={T.ink4} />
            </Pressable>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      <Tag
        dark={active}
        style={{
          minHeight: 44,
          paddingHorizontal: 14,
          borderWidth: active ? 0 : 1,
          borderColor: T.divider,
          backgroundColor: active ? T.ink : T.card,
        }}
      >
        {label}
      </Tag>
    </Pressable>
  );
}

function FilterSection({
  label,
  allLabel,
  options,
  selected,
  onSelect,
}: {
  label: string;
  allLabel: string;
  options: { value: string; label: string }[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  return (
    <View style={{ gap: 10 }}>
      <Text style={{ fontSize: 13, fontWeight: '600', color: T.ink2 }}>{label}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <FilterChip label={allLabel} active={selected === 'all'} onPress={() => onSelect('all')} />
        {options.map((option) => (
          <FilterChip
            key={option.value}
            label={option.label}
            active={selected === option.value}
            onPress={() => onSelect(option.value)}
          />
        ))}
      </View>
    </View>
  );
}

export function WardrobeListScreen({ navigation }: Props) {
  const t = useT();
  const [category, setCategory] = useState<ItemCategory | 'all'>('all');
  const [filters, setFilters] = useState<FilterValues>(DEFAULT_FILTERS);
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);
  const [search, setSearch] = useState('');
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
    // Freshness window so ordinary tab switches don't refetch. A cross-screen
    // mutation (import/edit/delete/wear) calls invalidateQueries, which marks
    // this query stale regardless of staleTime, so the focus refetch below still
    // fires after those — but a plain tab flip within the window is spared.
    staleTime: 60_000,
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

  // Wardrobe is a persistent tab (never unmounts), so an import's
  // invalidateAfterConfirmImport only marks this query stale while it's
  // inactive — React Query won't auto-refetch an inactive query, and switching
  // back doesn't remount. Refetch when the tab regains focus so freshly-imported
  // items appear without a manual pull-to-refresh. Gated on isStale, which the
  // staleTime window above keeps false for mutation-free tab flips.
  const refetch = query.refetch;
  const isStale = query.isStale;
  useFocusEffect(
    useCallback(() => {
      if (isStale) void refetch();
    }, [isStale, refetch]),
  );

  const insightsQuery = useQuery({
    queryKey: ['insightsSummary'],
    queryFn: getInsightsSummary,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const items = query.data?.items ?? [];
  const colorOptions = useMemo(() => {
    const byKey = new Map<string, string>();
    items.forEach((item) => {
      const color = item.color.trim();
      if (!color) return;
      const key = color.toLowerCase();
      if (!byKey.has(key)) byKey.set(key, color);
    });
    return Array.from(byKey.values()).sort((a, b) =>
      tColorFilterLabel(t.locale, a).localeCompare(tColorFilterLabel(t.locale, b)),
    );
  }, [items, t]);

  // API_GAP[untracked]: GET /v1/wardrobe-items lacks status/season/color filters.
  // Fallback: category is still server-side; these fields filter the fetched page locally.
  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (filters.status !== 'all' && item.status !== filters.status) return false;
      if (filters.season !== 'all' && !(item.seasonTags ?? []).includes(filters.season)) return false;
      if (filters.color !== 'all' && item.color.trim().toLowerCase() !== filters.color.toLowerCase()) {
        return false;
      }
      if (q) {
        const name = resolveItemDisplayName(t.locale, {
          name: item.name,
          nameSource: item.nameSource,
          displayName: item.displayName,
          localizedNames: item.localizedNames,
        }).toLowerCase();
        if (!name.includes(q) && !item.color.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [filters, items, search, t.locale]);

  const clientFilterCount =
    (filters.status !== 'all' ? 1 : 0) +
    (filters.season !== 'all' ? 1 : 0) +
    (filters.color !== 'all' ? 1 : 0);
  const activeFilterCount = clientFilterCount + (category !== 'all' ? 1 : 0);
  const hasActiveFilters = activeFilterCount > 0;
  const hasClientFilters = clientFilterCount > 0;
  const isSearching = search.trim().length > 0;
  const displayedTotal =
    hasClientFilters || isSearching ? filteredItems.length : (query.data?.total ?? 0);

  const idleCount = insightsQuery.data?.idleCount ?? 0;
  const showIdleHint = idleCount > 0;

  const renderItem = ({ item }: { item: WardrobeItem }) => (
    <ItemCard
      item={item}
      t={t}
      onPress={() => navigation.navigate('ItemDetail', { itemId: item.id })}
    />
  );

  const resetFilters = () => {
    setCategory('all');
    setFilters(DEFAULT_FILTERS);
  };

  const openInsights = () => {
    if (enableMvpV2Ui) {
      // Insights is no longer a primary tab under V2. Until the contextual-entry
      // phase wires a dedicated host, surface wardrobe questions through Ask so
      // the banner never dead-ends on a missing DiscoverTab. AskTab is a
      // persistent stack: clear focusedItemId/scope so a prior item-scoped Ask
      // (opened from item detail) doesn't leak into this wardrobe/global entry.
      (
        navigation.getParent() as { navigate: (name: string, params?: object) => void } | undefined
      )?.navigate('AskTab', {
        screen: 'AskAidrobe',
        params: { focusedItemId: undefined, scope: undefined },
      });
      return;
    }
    navigation.getParent<MainTabsNavigation>()?.navigate('DiscoverTab', { screen: 'Insights' });
  };

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
                <Text style={{ fontSize: 30, fontWeight: '700', color: T.ink }}>{t.t('wardrobe.title')}</Text>
                {query.isSuccess && (
                  <Text style={{ fontSize: 13, color: T.ink2, marginTop: 4 }}>
                    {t.t('wardrobe.stored')} {displayedTotal} {t.t('wardrobe.itemUnit')}
                  </Text>
                )}
              </View>
              {/* Circular add button */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t.t('add.title')}
                onPress={() => navigation.navigate('AddItem')}
                hitSlop={4}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: colors.accentSoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: 2,
                }}
              >
                <SystemIcon name="plus" size={22} color={T.ink} />
              </Pressable>
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
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder={t.t('wardrobe.searchPlaceholder')}
                  placeholderTextColor={T.ink4}
                  returnKeyType="search"
                  clearButtonMode="while-editing"
                  style={{ flex: 1, color: T.ink, fontSize: 16, padding: 0 }}
                />
                {search.length > 0 ? (
                  <Pressable
                    onPress={() => setSearch('')}
                    accessibilityRole="button"
                    accessibilityLabel={t.t('common.clear')}
                    hitSlop={8}
                  >
                    <SystemIcon name="x" size={16} color={T.ink3} />
                  </Pressable>
                ) : null}
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  hasActiveFilters
                    ? t.t('wardrobe.filter.active', { count: activeFilterCount })
                    : t.t('wardrobe.filter')
                }
                accessibilityState={{ selected: hasActiveFilters }}
                onPress={() => setFilterSheetVisible(true)}
                style={{
                  minWidth: 80,
                  height: 44,
                  backgroundColor: hasActiveFilters ? T.ink : T.card,
                  borderRadius: radius.md,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 7,
                  paddingHorizontal: 12,
                  ...T.shadowSm,
                }}
              >
                <SystemIcon
                  name="slider"
                  size={16}
                  color={hasActiveFilters ? colors.inverse : T.ink2}
                />
                <Text
                  style={{
                    fontSize: 13,
                    color: hasActiveFilters ? colors.inverse : T.ink2,
                    fontWeight: '600',
                  }}
                >
                  {t.t('wardrobe.filter')}
                </Text>
                {hasClientFilters ? (
                  <View
                    style={{
                      minWidth: 18,
                      height: 18,
                      paddingHorizontal: 5,
                      borderRadius: 9,
                      backgroundColor: T.accent,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: colors.inverse }}>
                      {clientFilterCount}
                    </Text>
                  </View>
                ) : null}
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
                    minHeight: 44,
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: radius.pill,
                    backgroundColor: category === cat.key ? T.ink : 'transparent',
                    borderWidth: 1,
                    borderColor: category === cat.key ? T.ink : T.divider,
                    justifyContent: 'center',
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

            {/* Idle-hint banner — only shown when there are idle items */}
            {showIdleHint && (
              <Pressable
                onPress={openInsights}
                style={{
                  marginHorizontal: 20,
                  marginTop: 12,
                  paddingVertical: 12,
                  paddingHorizontal: 14,
                  backgroundColor: colors.accentSoft,
                  borderRadius: radius.md,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Text style={{ fontSize: 13, color: T.ink2, flex: 1 }}>
                  {t.t('wardrobe.idle.hint', { count: String(idleCount) })}
                </Text>
                <SystemIcon name="chevronRight" size={15} color={T.ink3} />
              </Pressable>
            )}

            <View style={{ height: 14 }} />
          </View>
        }
        data={filteredItems}
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
          ) : hasActiveFilters ? (
            <View style={{ paddingHorizontal: 28, paddingTop: 36, gap: 14, alignItems: 'center' }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: T.ink }}>
                {t.t('wardrobe.filter.empty')}
              </Text>
              <Text style={{ fontSize: 13, color: T.ink3, textAlign: 'center' }}>
                {t.t('wardrobe.filter.emptyHint')}
              </Text>
              <Button
                label={t.t('wardrobe.filter.clear')}
                onPress={resetFilters}
                variant="secondary"
                size="sm"
              />
            </View>
          ) : (
            <WardrobeShowcaseEmpty
              onAddItem={() => navigation.navigate('AddItem')}
              onOpenItem={(id) => navigation.navigate('ItemDetail', { itemId: id })}
            />
          )
        }
      />
      <BottomSheet
        visible={filterSheetVisible}
        onClose={() => setFilterSheetVisible(false)}
        title={t.t('wardrobe.filter.title')}
      >
        <ScrollView
          style={{ maxHeight: 420 }}
          contentContainerStyle={{ gap: 18 }}
          showsVerticalScrollIndicator={false}
        >
          <FilterSection
            label={t.t('wardrobe.filter.status')}
            allLabel={t.t('common.all')}
            options={STATUS_KEYS.map((status) => ({
              value: status,
              label: t.tEnum('status', status),
            }))}
            selected={filters.status}
            onSelect={(value) =>
              setFilters((cur) => ({ ...cur, status: value as ItemStatus | 'all' }))
            }
          />

          <FilterSection
            label={t.t('wardrobe.filter.season')}
            allLabel={t.t('common.all')}
            options={SEASON_VALUES.map((season) => ({
              value: season,
              label: t.tEnum('season', season),
            }))}
            selected={filters.season}
            onSelect={(value) => setFilters((cur) => ({ ...cur, season: value }))}
          />

          <FilterSection
            label={t.t('item.color')}
            allLabel={t.t('common.all')}
            options={colorOptions.map((color) => ({
              value: color,
              label: tColorFilterLabel(t.locale, color),
            }))}
            selected={filters.color}
            onSelect={(value) => setFilters((cur) => ({ ...cur, color: value }))}
          />
        </ScrollView>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button
            label={t.t('wardrobe.filter.clear')}
            onPress={resetFilters}
            variant="secondary"
            disabled={!hasActiveFilters}
            style={{ flex: 1 }}
          />
          <Button
            label={t.t('wardrobe.filter.apply')}
            onPress={() => setFilterSheetVisible(false)}
            style={{ flex: 1 }}
          />
        </View>
      </BottomSheet>
    </View>
  );
}
