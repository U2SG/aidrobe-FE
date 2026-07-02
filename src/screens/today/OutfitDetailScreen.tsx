import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import {
  favoriteOutfit,
  getOutfitDetail,
  getOutfitItemReplacements,
  markOutfitWorn,
  unfavoriteOutfit,
} from '@/api/recommendations';
import { getWardrobeItem } from '@/api/wardrobe';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingBlock } from '@/components/feedback/LoadingBlock';
import { RecommendationFeedback } from '@/components/feedback/RecommendationFeedback';
import { OutfitBoard } from '@/components/outfit/OutfitBoard';
import { type GarmentPiece } from '@/components/outfit/garments';
import { RecommendationReasonList } from '@/components/product/RecommendationReasonList';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { GarmentSvg } from '@/components/ui/GarmentSvg';
import { ImageThumb } from '@/components/ui/ImageThumb';
import { SystemIcon } from '@/components/ui/SystemIcon';
import { Tag } from '@/components/ui/Tag';
import { useT } from '@/hooks/useT';
import { useTrack } from '@/hooks/useTrack';
import { useToastStore } from '@/store/toast';
import { buildRecommendationReasons } from '@/screens/today-v2/todayReasons';
import { colors, radius, shadow, type } from '@/theme/design';
import type {
  ItemCategory,
  OutfitDetail,
  OutfitObstacle,
  OutfitReplacementCandidate,
  TodayRecommendation,
  WardrobeItem,
} from '@/types/api';
import type { TodayStackParamList } from '@/types/navigation';
import { renderI18n } from '@/utils/i18n';
import { shareWithAsset } from '@/utils/share';

type Props = NativeStackScreenProps<TodayStackParamList, 'OutfitDetail'>;

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
  accentBg: colors.accentSoft,
  ok: colors.success,
  warn: colors.warning,
  warnBg: colors.warningBg,
  red: colors.danger,
  shadowSm: shadow.soft,
  shadowMd: shadow.elevated,
};

function categoryToGarment(cat?: ItemCategory | string | null): GarmentPiece['kind'] {
  switch (cat) {
    case 'top':
      return 'shirt';
    case 'bottom':
      return 'trousers';
    case 'outerwear':
      return 'blazer';
    case 'dress':
      return 'dress';
    case 'shoes':
      return 'loafer';
    case 'accessory':
      return 'bag';
    default:
      return 'shirt';
  }
}

// Static layout positions for the flat-lay board — mirrors TodayScreen's
// EXTRA_PIECE_LAYOUT pattern. Backend returns no positions; client-defined.
const BOARD_LAYOUT: { x: number; y: number; scale: number; rotate?: string }[] = [
  { x: 36,  y: 30,  scale: 1.2 },
  { x: 165, y: 18,  scale: 1.3 },
  { x: 90,  y: 175, scale: 1.1 },
  { x: 195, y: 250, scale: 0.85 },
  { x: 30,  y: 230, scale: 0.7 },
];

type DisplayItem = {
  id: string;
  slotItemId: string;
  name: string;
  category: ItemCategory | null;
  color: string;
  imageUrl: string | null;
  status: WardrobeItem['status'];
  location?: string | null;
  sizeLabel?: string | null;
  fitIntent?: string | null;
  fitStatus?: WardrobeItem['fitStatus'];
};

type ReplacementTarget = {
  slotItemId: string;
  itemId: string;
  name: string;
};

export function OutfitDetailScreen({ navigation, route }: Props) {
  const { outfitId } = route.params;
  const isLocal = outfitId === 'local-showcase';
  const track = useTrack();
  const qc = useQueryClient();
  const { t, tEnum } = useT();
  const showToast = useToastStore((state) => state.show);
  const [localReplacements, setLocalReplacements] = useState<Record<string, OutfitReplacementCandidate>>({});
  const [ignoredObstacleItemIds, setIgnoredObstacleItemIds] = useState<Set<string>>(() => new Set());
  const [replacementTarget, setReplacementTarget] = useState<ReplacementTarget | null>(null);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [autoReplacingItemId, setAutoReplacingItemId] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);

  const outfitQuery = useQuery({
    queryKey: ['outfitDetail', outfitId],
    queryFn: () => getOutfitDetail(outfitId),
    enabled: !isLocal,
    retry: 1,
  });

  const itemBriefs = outfitQuery.data?.items ?? [];
  const itemQueries = useQueries({
    queries: itemBriefs.map((b) => ({
      queryKey: ['wardrobeItem', b.id],
      queryFn: () => getWardrobeItem(b.id),
      staleTime: 60 * 1000,
    })),
  });
  const fullItems: WardrobeItem[] = itemQueries
    .map((q) => q.data)
    .filter((x): x is WardrobeItem => Boolean(x));

  const replacementQuery = useQuery({
    queryKey: ['outfitReplacements', outfitId, replacementTarget?.itemId],
    queryFn: () => getOutfitItemReplacements(outfitId, replacementTarget!.itemId),
    enabled: !isLocal && Boolean(replacementTarget),
    retry: 1,
  });

  const favoriteMutation = useMutation({
    mutationFn: (nextFavorited: boolean) =>
      nextFavorited ? favoriteOutfit(outfitId) : unfavoriteOutfit(outfitId),
    onMutate: async (nextFavorited) => {
      await qc.cancelQueries({ queryKey: ['outfitDetail', outfitId] });
      const previous = qc.getQueryData<OutfitDetail>(['outfitDetail', outfitId]);
      qc.setQueryData<OutfitDetail>(['outfitDetail', outfitId], (old) =>
        old ? { ...old, isFavorited: nextFavorited } : old,
      );
      return { previous };
    },
    onSuccess: (_data, nextFavorited) => {
      showToast({
        message: nextFavorited
          ? t('outfitDetail.favorite.added')
          : t('outfitDetail.favorite.removed'),
        kind: 'success',
      });
    },
    onError: (_error, _nextFavorited, context) => {
      if (context?.previous) qc.setQueryData(['outfitDetail', outfitId], context.previous);
      showToast({ message: t('outfitDetail.favorite.failed'), kind: 'error' });
    },
  });

  const fullItemById = useMemo(() => {
    const map = new Map<string, WardrobeItem>();
    for (const item of fullItems) map.set(item.id, item);
    return map;
  }, [fullItems]);

  const displayItems = useMemo<DisplayItem[]>(() => {
    return itemBriefs.map((brief) => {
      const replacement = localReplacements[brief.id];
      if (replacement) {
        return {
          id: replacement.itemId,
          slotItemId: brief.id,
          name: replacement.title,
          category: replacement.category,
          color: replacement.colorMain,
          imageUrl: replacement.thumbnailUrl,
          status: 'wearable',
          location: null,
          sizeLabel: null,
          fitIntent: null,
          fitStatus: 'unknown',
        };
      }

      const fullItem = fullItemById.get(brief.id);
      return {
        id: brief.id,
        slotItemId: brief.id,
        name: fullItem?.name ?? brief.name ?? '—',
        category: fullItem?.category ?? brief.category ?? null,
        color: fullItem?.color ?? brief.color ?? '',
        imageUrl: fullItem?.imageUrl ?? brief.thumbUrl ?? null,
        status: fullItem?.status ?? 'wearable',
        location: fullItem?.location ?? null,
        sizeLabel: fullItem?.sizeLabel ?? null,
        fitIntent: fullItem?.fitIntent ?? null,
        fitStatus: fullItem?.fitStatus ?? 'unknown',
      };
    });
  }, [fullItemById, itemBriefs, localReplacements]);

  // Build GarmentPiece[] for OutfitBoard from displayItems.
  const boardPieces = useMemo<GarmentPiece[]>(
    () =>
      displayItems.map((it, i) => {
        const layout = BOARD_LAYOUT[i] ?? BOARD_LAYOUT[BOARD_LAYOUT.length - 1]!;
        return {
          ...layout,
          itemId: it.id,
          kind: categoryToGarment(it.category),
          imageUrl: it.imageUrl ?? null,
          name: it.name,
        };
      }),
    [displayItems],
  );

  const handleWear = async () => {
    if (!isLocal) {
      try {
        await markOutfitWorn(outfitId);
      } catch {
        /* swallow — feedback can still proceed */
      }
    }
    track('outfit_worn', { outfitId });
    navigation.navigate('FeedbackSheet', { outfitId });
  };

  function applyLocalReplacement(
    slotItemId: string,
    candidate: OutfitReplacementCandidate,
    source: 'auto' | 'sheet',
  ) {
    // API_GAP[BE#62]: no persist-replacement endpoint; swap is local-only.
    setLocalReplacements((prev) => ({ ...prev, [slotItemId]: candidate }));
    showToast({ message: t('outfitDetail.replacementApplied', { name: candidate.title }), kind: 'success' });
    track('outfit_item_replaced', {
      outfitId,
      source,
      originalItemId: slotItemId,
      replacementItemId: candidate.itemId,
    });
  }

  const handleFavorite = () => {
    if (isLocal) {
      showToast({ message: t('outfitDetail.favorite.unavailable'), kind: 'info' });
      return;
    }
    favoriteMutation.mutate(!isFavorited);
  };

  const shareOutfitSummary = async (source: 'download' | 'overflow') => {
    const items = displayItems.map((item) => item.name).filter(Boolean).join(' / ') || t('outfitDetail.noItems');
    await shareWithAsset(t('outfitDetail.shareMessage', { title: heroTitle, items }));
    track('outfit_shared', { outfitId, source });
  };

  const handleDownload = async () => {
    // API_GAP[untracked]: no poster/share image asset — fallback to text summary.
    showToast({ message: t('outfitDetail.downloadNoAsset'), kind: 'info' });
    await shareOutfitSummary('download');
  };

  const openReplacementSheet = (item: DisplayItem) => {
    if (isLocal) {
      showToast({ message: t('outfitDetail.replacementUnavailable'), kind: 'info' });
      return;
    }
    setReplacementTarget({ slotItemId: item.slotItemId, itemId: item.id, name: item.name });
  };

  const handleAutoReplace = async (obstacle: OutfitObstacle) => {
    if (isLocal || autoReplacingItemId) {
      showToast({ message: t('outfitDetail.replacementUnavailable'), kind: 'info' });
      return;
    }
    setAutoReplacingItemId(obstacle.itemId);
    try {
      const replacements = await qc.fetchQuery({
        queryKey: ['outfitReplacements', outfitId, obstacle.itemId],
        queryFn: () => getOutfitItemReplacements(outfitId, obstacle.itemId),
      });
      const top = replacements[0];
      if (!top) {
        showToast({ message: t('outfitDetail.replacementNone'), kind: 'info' });
        return;
      }
      applyLocalReplacement(obstacle.itemId, top, 'auto');
    } catch {
      showToast({ message: t('outfitDetail.replacementUnavailable'), kind: 'error' });
    } finally {
      setAutoReplacingItemId(null);
    }
  };

  const handleIgnoreObstacle = (obstacle: OutfitObstacle) => {
    setIgnoredObstacleItemIds((prev) => {
      const next = new Set(prev);
      next.add(obstacle.itemId);
      return next;
    });
    showToast({ message: t('outfitDetail.obstacleIgnored'), kind: 'success' });
    track('outfit_obstacle_ignored', { outfitId, itemId: obstacle.itemId, kind: obstacle.kind });
  };

  const handleSelectReplacement = (candidate: OutfitReplacementCandidate) => {
    if (!replacementTarget) return;
    applyLocalReplacement(replacementTarget.slotItemId, candidate, 'sheet');
    setReplacementTarget(null);
  };

  if (!isLocal && outfitQuery.isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: T.bg, alignItems: 'center', justifyContent: 'center' }}>
        <LoadingBlock />
      </View>
    );
  }
  if (!isLocal && (outfitQuery.isError || !outfitQuery.data)) {
    return (
      <View style={{ flex: 1, backgroundColor: T.bg, padding: 24 }}>
        <ErrorState onRetry={() => outfitQuery.refetch()} />
      </View>
    );
  }

  const heroTitle = outfitQuery.data?.title ?? '通勤 · 黑白经典';
  const isFavorited = outfitQuery.data?.isFavorited ?? false;

  // V3+ B — server-provided. Null when flags off.
  const apiObstacles = outfitQuery.data?.obstacles ?? null;
  const apiPrepSteps = outfitQuery.data?.prepSteps ?? null;
  const apiPrepNotes = outfitQuery.data?.prepNotes ?? null;

  // Pick the most severe obstacle for the top banner.
  const activeObstacles =
    apiObstacles?.filter(
      (o) => !ignoredObstacleItemIds.has(o.itemId) && !localReplacements[o.itemId],
    ) ?? [];
  const primaryObstacle =
    activeObstacles.find((o) => o.severity === 'blocking') ??
    activeObstacles.find((o) => o.severity === 'warning') ??
    activeObstacles[0] ??
    null;

  const reasons = outfitQuery.data
    ? buildRecommendationReasons(outfitQuery.data)
    : [];

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View
        style={{
          paddingTop: 52,
          paddingHorizontal: 16,
          paddingBottom: 8,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <Pressable
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          hitSlop={8}
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
        >
          <SystemIcon name="chevronLeft" size={22} color={T.ink} />
        </Pressable>
        {/* Centered title — absolute so side buttons don't shift it */}
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 52,
            height: 52,
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <Text style={{ ...type.headline, color: T.ink, fontWeight: '600' }}>
            {t('outfitDetail.screenTitle')}
          </Text>
        </View>
        <View style={{ flex: 1 }} />
        <Pressable
          onPress={() => setOverflowOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={t('outfitDetail.moreActions')}
          hitSlop={8}
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
        >
          <SystemIcon name="more" size={20} color={T.ink2} />
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Obstacle banner ─────────────────────────────────────────────── */}
        {primaryObstacle && (
          <View style={{ paddingHorizontal: 16 }}>
            <View
              style={{
                marginTop: 8,
                padding: 14,
                borderRadius: 14,
                backgroundColor: T.warnBg,
                borderWidth: 1,
                borderColor: '#E5D2A8',
                flexDirection: 'row',
                gap: 12,
              }}
            >
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: T.warn,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <SystemIcon name="exclamation" size={18} color="#fff" strokeWidth={2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#5C4F3F', marginBottom: 4 }}>
                  {renderI18n(primaryObstacle.title)}
                </Text>
                <Text style={{ fontSize: 11, color: '#7A6A55', lineHeight: 17, marginBottom: 8 }}>
                  {t('outfitDetail.replacementHint')}
                </Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Pressable
                    onPress={() => handleAutoReplace(primaryObstacle)}
                    disabled={autoReplacingItemId === primaryObstacle.itemId}
                    accessibilityRole="button"
                    accessibilityLabel={t('outfitDetail.autoReplace')}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      backgroundColor: T.ink,
                      borderRadius: 8,
                      opacity: autoReplacingItemId === primaryObstacle.itemId ? 0.62 : 1,
                    }}
                  >
                    <Text style={{ color: colors.inverse, fontSize: 11, fontWeight: '600' }}>
                      {autoReplacingItemId === primaryObstacle.itemId
                        ? t('outfitDetail.replacementLoading')
                        : t('outfitDetail.autoReplace')}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handleIgnoreObstacle(primaryObstacle)}
                    accessibilityRole="button"
                    accessibilityLabel={t('outfitDetail.ignoreObstacle')}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: '#D4B687',
                    }}
                  >
                    <Text style={{ color: '#7A6A55', fontSize: 11 }}>{t('outfitDetail.ignoreObstacle')}</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* ── OutfitBoard flat-lay ─────────────────────────────────────────── */}
        <View style={{ marginTop: 16, alignItems: 'center' }}>
          <OutfitBoard pieces={boardPieces} />
        </View>

        {/* ── Divider ─────────────────────────────────────────────────────── */}
        <View style={{ height: 1, backgroundColor: colors.separatorSoft, marginTop: 20 }} />

        {/* ── "为什么适合今天" ──────────────────────────────────────────────── */}
        {reasons.length > 0 && (
          <View style={{ paddingHorizontal: 24, marginTop: 20 }}>
            <Text style={{ ...type.callout, fontWeight: '600', color: T.ink, marginBottom: 14 }}>
              {t('outfitDetail.sectionWhy')}
            </Text>
            <RecommendationReasonList reasons={reasons} />
          </View>
        )}

        {/* ── Divider ─────────────────────────────────────────────────────── */}
        <View style={{ height: 1, backgroundColor: colors.separatorSoft, marginTop: 20, marginHorizontal: 24 }} />

        {/* ── "这套包含" items ────────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 24, marginTop: 20 }}>
          <Text style={{ ...type.callout, fontWeight: '600', color: T.ink, marginBottom: 14 }}>
            {t('outfitDetail.sectionContains')}
          </Text>
          <View style={{ gap: 8 }}>
            {displayItems.map((it) => {
              const isLaundry = it.status !== 'wearable';
              return (
                <Pressable
                  key={it.slotItemId}
                  onPress={() =>
                    navigation.getParent()?.navigate('WardrobeTab', {
                      screen: 'ItemDetail',
                      params: { itemId: it.id },
                    } as never)
                  }
                  onLongPress={() => openReplacementSheet(it)}
                  style={({ pressed }) => ({
                    backgroundColor: T.card,
                    borderRadius: radius.md,
                    padding: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    ...T.shadowSm,
                    borderWidth: isLaundry ? 1 : 0,
                    borderColor: isLaundry ? '#E5D2A8' : 'transparent',
                    opacity: pressed ? 0.88 : isLaundry ? 0.85 : 1,
                  })}
                >
                  <View
                    style={{
                      width: 56,
                      height: 56,
                      backgroundColor: T.cardInner,
                      borderRadius: 10,
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    <ImageThumb
                      uri={it.imageUrl ?? undefined}
                      size={56}
                      cornerRadius={10}
                      icon={<GarmentSvg kind={categoryToGarment(it.category)} size={44} />}
                    />
                    {isLaundry && (
                      <View
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          backgroundColor: 'rgba(242,242,247,0.68)',
                          borderRadius: 10,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <SystemIcon name="recycle" size={19} color={T.warn} />
                      </View>
                    )}
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: T.ink, marginBottom: 2 }} numberOfLines={1}>
                      {it.name}
                    </Text>
                    <Text style={{ fontSize: 10, color: T.ink3, marginBottom: 4 }} numberOfLines={1}>
                      {[it.sizeLabel, it.fitIntent, it.location].filter(Boolean).join(' · ') || it.color || '—'}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 4 }}>
                      {isLaundry ? (
                        <View
                          style={{
                            paddingHorizontal: 6,
                            paddingVertical: 2,
                            borderRadius: 999,
                            backgroundColor: '#F4E8D1',
                          }}
                        >
                          <Text style={{ fontSize: 9, color: '#7A5C2F', fontWeight: '600' }}>{String(it.status)}</Text>
                        </View>
                      ) : (
                        <Tag style={{ paddingHorizontal: 6, paddingVertical: 2 }}>
                          {it.fitStatus ? tEnum('fitStatus', it.fitStatus) : t('outfitDetail.fitGood')}
                        </Tag>
                      )}
                      {it.location ? (
                        <Tag style={{ paddingHorizontal: 6, paddingVertical: 2 }}>{it.location}</Tag>
                      ) : null}
                    </View>
                  </View>
                  <SystemIcon name="chevronRight" size={18} color={T.ink3} />
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* ── Prep steps (取衣与准备) ──────────────────────────────────────── */}
        <View style={{ marginTop: 14, marginHorizontal: 24, padding: 14, backgroundColor: T.cardSoft, borderRadius: 14, gap: 8 }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: T.ink2 }}>取衣与准备</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {apiPrepSteps && apiPrepSteps.length > 0
              ? apiPrepSteps.map((step, i) => (
                  <Tag key={`${step.key}-${i}`}>
                    {`${['①', '②', '③', '④', '⑤'][i] ?? '·'} ${renderI18n(step)}`}
                  </Tag>
                ))
              : fullItems
                  .filter((it) => it.location)
                  .map((it, i) => (
                    <Tag key={it.id}>
                      {`${['①', '②', '③', '④', '⑤'][i] ?? '·'} ${it.location} 取${it.name}`}
                    </Tag>
                  ))}
            {apiPrepNotes?.map((note, i) => <Tag key={`note-${i}`}>{renderI18n(note)}</Tag>)}
            {!apiPrepSteps && fullItems.length === 0 && <Tag>无需熨烫</Tag>}
          </View>
        </View>

        {/* ── OOTD poster entry ────────────────────────────────────────────── */}
        <Pressable
          onPress={() => navigation.navigate('OotdPoster', { outfitId, outfitTitle: heroTitle })}
          style={{
            marginTop: 14,
            marginHorizontal: 24,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            padding: 14,
            backgroundColor: T.card,
            borderRadius: 14,
            ...T.shadowSm,
          }}
        >
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              backgroundColor: T.accentBg,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <SystemIcon name="sparkle" size={18} color={T.accent} strokeWidth={1.9} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: T.ink }}>生成 OOTD 海报</Text>
            <Text style={{ fontSize: 11, color: T.ink3, marginTop: 2 }}>用穿着自拍生成风格化海报</Text>
          </View>
          <SystemIcon name="chevronRight" size={18} color={T.ink3} />
        </Pressable>

        {/* ── RecommendationFeedback (shown when user taps 不喜欢) ────────── */}
        {!isLocal && showFeedback ? (
          <View style={{ marginTop: 20, marginHorizontal: 24 }}>
            <RecommendationFeedback
              outfitId={outfitId}
              temperatureC={
                qc.getQueryData<TodayRecommendation>(['todayRecommendation'])?.context?.weather?.temperatureC ?? null
              }
            />
          </View>
        ) : null}
      </ScrollView>

      {/* ── Bottom bar ──────────────────────────────────────────────────────── */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: 36,
          backgroundColor: T.bg,
        }}
      >
        {/* Full-width black CTA — 54h, matches DecisionOutfitCard */}
        <Pressable
          onPress={handleWear}
          style={({ pressed }) => ({
            height: 54,
            borderRadius: radius.md,
            backgroundColor: colors.label,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.88 : 1,
          })}
        >
          <Text style={{ ...type.callout, fontWeight: '600', color: colors.inverse }}>
            {t('outfitDetail.wearToday')}
          </Text>
        </Pressable>

        {/* 不喜欢 · 换一套 text link row */}
        <View
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 14 }}
        >
          <Pressable
            onPress={() => setShowFeedback((v) => !v)}
            hitSlop={6}
            accessibilityRole="button"
          >
            <Text style={{ ...type.callout, color: colors.tertiaryLabel }}>
              {t('outfitDetail.dislikeSwap')}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* ── Replacement bottom sheet ──────────────────────────────────────── */}
      <BottomSheet
        visible={Boolean(replacementTarget)}
        onClose={() => setReplacementTarget(null)}
        title={t('outfitDetail.replacementsTitle', { name: replacementTarget?.name ?? '' })}
      >
        {replacementQuery.isLoading ? (
          <View style={{ paddingVertical: 16, alignItems: 'center' }}>
            <LoadingBlock />
          </View>
        ) : replacementQuery.isError ? (
          <View style={{ gap: 12 }}>
            <Text style={{ fontSize: 13, color: T.ink2, textAlign: 'center', lineHeight: 19 }}>
              {t('outfitDetail.replacementUnavailable')}
            </Text>
            <Button
              label={t('common.retry')}
              variant="secondary"
              onPress={() => {
                void replacementQuery.refetch();
              }}
            />
          </View>
        ) : replacementQuery.data?.length ? (
          <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
            <View style={{ gap: 10 }}>
              {replacementQuery.data.map((candidate) => {
                const meta = [
                  tEnum('category', candidate.category),
                  tEnum('color', candidate.colorMain),
                  t('outfitDetail.replacementSimilarity', {
                    pct: Math.round(candidate.similarity * 100),
                  }),
                ]
                  .filter(Boolean)
                  .join(' · ');
                return (
                  <Pressable
                    key={candidate.itemId}
                    onPress={() => handleSelectReplacement(candidate)}
                    accessibilityRole="button"
                    accessibilityLabel={t('outfitDetail.selectReplacement', { name: candidate.title })}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      padding: 10,
                      borderRadius: 12,
                      backgroundColor: pressed ? T.bgAlt : T.cardSoft,
                    })}
                  >
                    <ImageThumb
                      uri={candidate.thumbnailUrl}
                      size={54}
                      fallbackLabel={candidate.title || tEnum('category', candidate.category)}
                    />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: '700', color: T.ink }}>
                        {candidate.title}
                      </Text>
                      <Text numberOfLines={1} style={{ fontSize: 11, color: T.ink3, marginTop: 3 }}>
                        {meta}
                      </Text>
                    </View>
                    <SystemIcon name="chevronRight" size={16} color={T.ink3} />
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        ) : (
          <Text style={{ fontSize: 13, color: T.ink2, textAlign: 'center', lineHeight: 19 }}>
            {t('outfitDetail.replacementNone')}
          </Text>
        )}
      </BottomSheet>

      {/* ── Overflow actions bottom sheet ─────────────────────────────────── */}
      <BottomSheet
        visible={overflowOpen}
        onClose={() => setOverflowOpen(false)}
        title={t('outfitDetail.overflowTitle')}
      >
        <View style={{ gap: 10 }}>
          <Button
            label={t('outfitDetail.overflowShare')}
            variant="secondary"
            icon={<SystemIcon name="share" size={17} color={T.ink2} />}
            onPress={() => {
              setOverflowOpen(false);
              void shareOutfitSummary('overflow');
            }}
          />
          <Button
            label={t('outfitDetail.download')}
            variant="secondary"
            icon={<SystemIcon name="download" size={17} color={T.ink2} />}
            onPress={() => {
              setOverflowOpen(false);
              void handleDownload();
            }}
          />
          <Button
            label={isFavorited ? t('outfitDetail.unfavorite') : t('outfitDetail.favorite')}
            variant="secondary"
            loading={favoriteMutation.isPending}
            icon={
              <SystemIcon
                name="heart"
                size={17}
                color={isFavorited ? T.red : T.ink2}
                fill={isFavorited ? T.red : 'none'}
              />
            }
            onPress={() => {
              handleFavorite();
              setOverflowOpen(false);
            }}
          />
          <Button
            label={t('outfitDetail.overflowFeedback')}
            variant="primary"
            icon={<SystemIcon name="check" size={17} color={colors.inverse} />}
            onPress={() => {
              setOverflowOpen(false);
              void handleWear();
            }}
          />
        </View>
      </BottomSheet>
    </View>
  );
}
