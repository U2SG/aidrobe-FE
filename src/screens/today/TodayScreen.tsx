import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { getTodayRecommendation, refreshTodayRecommendation } from '@/api/recommendations';
import { getUserSettings } from '@/api/settings';
import { getWardrobeItem } from '@/api/wardrobe';
import { OutfitBoard } from '@/components/outfit/OutfitBoard';
import WeatherBackdrop from '@/components/outfit/WeatherBackdrop';
import {
  CANVAS_H,
  GARMENT_IMAGES,
  type GarmentKind,
  type GarmentPiece,
} from '@/components/outfit/garments';
import { AIOrb } from '@/components/ui/AIOrb';
import { GarmentSvg } from '@/components/ui/GarmentSvg';
import { SystemIcon } from '@/components/ui/SystemIcon';
import { todayBoardMode } from '@/screens/today/todayBoard';
import { useT, type UseT } from '@/hooks/useT';
import type { I18nKey, TParams } from '@/i18n';
import { useTrack } from '@/hooks/useTrack';
import { useToastStore } from '@/store/toast';
import { colors, radius, shadow } from '@/theme/design';
import { motion } from '@/theme/motion';
import type { ItemCategory, OutfitSummary, OutfitVariant, WardrobeItem, WeatherContext } from '@/types/api';
import type { MainTabsParamList, TodayStackParamList } from '@/types/navigation';
import { shareWithAsset } from '@/utils/share';

type TFn = (key: I18nKey, params?: TParams) => string;

type Props = CompositeScreenProps<
  NativeStackScreenProps<TodayStackParamList, 'Today'>,
  BottomTabScreenProps<MainTabsParamList>
>;

const P = {
  bg: '#F8F8F4',
  panel: '#FFFFFF',
  ink: '#111316',
  muted: '#70757D',
  faint: '#AAB0B7',
  line: '#E6E8E5',
  wash: '#EEF3F1',
  blue: '#7D9AAE',
  blueSoft: '#E6EEF4',
  sage: '#8EA58F',
  sageSoft: '#E9F0EA',
  clay: '#C8B8A1',
};

type StrategyKey = 'safe' | 'fast' | 'stylish';

type StrategyPreset = {
  // Display copy (title/signal) is sourced from i18n (today.preset.<key>.*);
  // the preset only carries the visual + timing showcase data.
  icon: 'shield' | 'clock' | 'sparkle';
  pieces: GarmentPiece[];
  prepMinutes: number;
};


const PRESETS: Record<StrategyKey, StrategyPreset> = {
  safe: {
    icon: 'shield',
    pieces: [
      { kind: 'shirt', x: 8, y: 14, scale: 1.12, rotate: '-7deg' },
      { kind: 'trousers', x: 128, y: 128, scale: 1.24, rotate: '2deg' },
      { kind: 'bag', x: 8, y: 284, scale: 0.72, rotate: '7deg' },
      { kind: 'sneaker', x: 208, y: 292, scale: 0.78, rotate: '-5deg' },
    ],
    prepMinutes: 8,
  },
  fast: {
    icon: 'clock',
    pieces: [
      { kind: 'sweater', x: 28, y: 18, scale: 1.22, rotate: '-4deg' },
      { kind: 'jeans', x: 132, y: 154, scale: 1.26, rotate: '3deg' },
      { kind: 'sneaker', x: 206, y: 300, scale: 0.82, rotate: '-6deg' },
    ],
    prepMinutes: 5,
  },
  stylish: {
    icon: 'sparkle',
    pieces: [
      { kind: 'shirt', x: 2, y: 22, scale: 1.08, rotate: '-8deg' },
      { kind: 'trousers', x: 132, y: 126, scale: 1.22, rotate: '2deg' },
      { kind: 'bag', x: 10, y: 282, scale: 0.74, rotate: '7deg' },
      { kind: 'sneaker', x: 210, y: 292, scale: 0.78, rotate: '-5deg' },
    ],
    prepMinutes: 12,
  },
};

const STRATEGY_ORDER: StrategyKey[] = ['safe', 'fast', 'stylish'];
const EXTRA_PIECE_LAYOUT: Pick<GarmentPiece, 'x' | 'y' | 'scale' | 'rotate'>[] = [
  { x: 8, y: 14, scale: 1.12, rotate: '-7deg' },
  { x: 128, y: 128, scale: 1.24, rotate: '2deg' },
  { x: 8, y: 284, scale: 0.72, rotate: '7deg' },
  { x: 208, y: 292, scale: 0.78, rotate: '-5deg' },
  { x: 184, y: 18, scale: 0.86, rotate: '5deg' },
];

function asStrategyKey(variant: OutfitVariant): StrategyKey {
  const v = String(variant);
  if (v === 'safe' || v === 'fast' || v === 'stylish') return v;
  return 'safe';
}

function categoryToGarment(cat?: ItemCategory | string | null): GarmentKind {
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
      return 'sneaker';
    case 'accessory':
      return 'bag';
    default:
      return 'shirt';
  }
}

function resolveOutfitPieces(
  outfit: OutfitSummary | undefined,
  preset: StrategyPreset,
  itemById: Map<string, WardrobeItem>,
): GarmentPiece[] {
  if (!outfit?.items.length) return preset.pieces;

  return outfit.items.map((brief, index) => {
    const item = itemById.get(brief.id);
    const layout = preset.pieces[index] ?? EXTRA_PIECE_LAYOUT[index % EXTRA_PIECE_LAYOUT.length]!;
    return {
      ...layout,
      itemId: brief.id,
      kind: categoryToGarment(item?.category ?? brief.category),
      imageUrl: item?.imageUrl ?? brief.thumbUrl ?? null,
      name: item?.name ?? brief.name ?? null,
    };
  });
}

function useRemainingMinutes(departureTime: string | null): number {
  const now = new Date();
  if (!departureTime) return 38;
  const [rawH, rawM] = departureTime.split(':');
  const dep = new Date(now);
  dep.setHours(Number(rawH ?? 8), Number(rawM ?? 30), 0, 0);
  const diff = Math.round((dep.getTime() - now.getTime()) / 60000);
  return Math.max(0, Math.min(90, diff));
}

function weatherLabel(t: TFn, condition: string) {
  const c = condition.toLowerCase();
  if (c.includes('rain')) return t('today.weather.rain');
  if (c.includes('cloud')) return t('today.weather.cloud');
  if (c.includes('sun') || c.includes('clear')) return t('today.weather.sun');
  return condition;
}

function sceneLabel(t: TFn, scene: string | null) {
  switch (scene) {
    case 'commute':
      return t('today.scene.commute');
    case 'formal':
      return t('today.scene.formal');
    case 'casual':
      return t('today.scene.casual');
    default:
      return scene;
  }
}

// 3-tier weather mood, driven off the condition text (QWeather returns Chinese
// like 晴/多云/小雨). rainProbability is a secondary signal — the backend's
// /weather/now hardcodes it to 0 today, so text is the reliable source.
type WeatherTier = 'rain' | 'sun' | 'cloud';

function weatherTier(weather: WeatherContext): WeatherTier {
  const c = weather.condition;
  if (weather.rainProbability >= 0.5 || /rain|drizzle|shower|storm|雨|雪|snow|雷/i.test(c)) return 'rain';
  if (/sun|clear|晴/i.test(c)) return 'sun';
  return 'cloud';
}

// Restrained editorial palettes — keep lightness close so white panels still read.
const WX_THEME: Record<WeatherTier, { top: string; bottom: string; ribbon: string; tint: string }> = {
  rain: { top: '#EAEFF2', bottom: '#DBE3E8', ribbon: '#E2EAEF', tint: '#6F8EA2' },
  sun: { top: '#FBF7EE', bottom: '#F2EBDA', ribbon: '#F5EEDC', tint: '#C2A06A' },
  cloud: { top: '#F4F3EF', bottom: '#E7E6E0', ribbon: '#ECEBE5', tint: '#94938F' },
};

function windLabel(t: TFn, weather: WeatherContext): string | null {
  if (!weather.windDir) return null;
  return weather.windScale
    ? t('today.weather.windScale', { dir: weather.windDir, scale: weather.windScale })
    : weather.windDir;
}

function climateAdvice(t: TFn, weather: WeatherContext) {
  if (weatherTier(weather) === 'rain') return t('today.advice.waterproof');
  if (weather.temperatureC >= 28) return t('today.advice.breathable');
  if (weather.temperatureC <= 12) return t('today.advice.layer');
  return t('today.advice.lightJacket');
}

function WeatherRibbon({
  weather,
  theme,
  t,
}: {
  weather: WeatherContext;
  theme: { ribbon: string; tint: string };
  t: TFn;
}) {
  const rain = Math.round(weather.rainProbability * 100);
  return (
    <View
      style={{
        width: 58,
        borderRadius: 29,
        backgroundColor: theme.ribbon,
        alignItems: 'center',
        paddingVertical: 16,
        gap: 14,
      }}
    >
      <Text style={{ color: P.ink, fontSize: 20, fontWeight: '700' }}>{Math.round(weather.temperatureC)}°</Text>
      <View style={{ width: 1, height: 92, backgroundColor: theme.tint }} />
      <View style={{ alignItems: 'center', gap: 3 }}>
        <Text style={{ color: theme.tint, fontSize: 11, fontWeight: '700', letterSpacing: 0.8 }}>{rain}%</Text>
        <Text style={{ color: P.muted, fontSize: 10 }}>{t('today.weather.rainLabel')}</Text>
      </View>
      <View style={{ alignItems: 'center', gap: 3 }}>
        <Text style={{ color: P.ink, fontSize: 12, fontWeight: '700' }}>{weatherLabel(t, weather.condition)}</Text>
        <Text style={{ color: P.muted, fontSize: 10 }}>
          {weather.humidity != null
            ? t('today.weather.humidity', { value: weather.humidity })
            : t('today.weather.feelsLike', { value: Math.round(weather.feelsLikeC) })}
        </Text>
      </View>
    </View>
  );
}

function StrategyRail({
  active,
  onChange,
  tEnum,
}: {
  active: StrategyKey;
  onChange: (key: StrategyKey) => void;
  tEnum: UseT['tEnum'];
}) {
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {STRATEGY_ORDER.map((key) => {
        const selected = key === active;
        const variantLabel = tEnum('variant', key);
        return (
          <Pressable
            key={key}
            onPress={() => onChange(key)}
            accessibilityRole="button"
            accessibilityLabel={variantLabel}
            style={{
              height: 40,
              minWidth: 58,
              paddingHorizontal: 13,
              borderRadius: 20,
              backgroundColor: selected ? P.ink : P.panel,
              borderWidth: 1,
              borderColor: selected ? P.ink : P.line,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: selected ? colors.inverse : P.muted, fontSize: 13, fontWeight: '700' }}>{variantLabel}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function EmptyCanvas({ t }: { t: TFn }) {
  return (
    <View
      style={{
        flex: 1,
        minHeight: CANVAS_H * 0.82,
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View
        style={{
          position: 'absolute',
          left: 20,
          right: 14,
          top: 26,
          bottom: 28,
          borderRadius: 42,
          backgroundColor: P.wash,
          opacity: 0.5,
        }}
      />
      <SystemIcon name="sparkle" size={22} color={P.faint} strokeWidth={1.8} />
      <Text style={{ color: P.muted, fontSize: 13, fontWeight: '700', marginTop: 10 }}>
        {t('today.cantBuild')}
      </Text>
      <Text style={{ color: P.faint, fontSize: 11, marginTop: 4 }}>{t('today.unlockMore')}</Text>
    </View>
  );
}

function CompactCandidate({
  preset,
  strategyKey,
  pieces,
  selected,
  empty,
  onPress,
  t,
}: {
  preset: StrategyPreset;
  strategyKey: StrategyKey;
  pieces: GarmentPiece[];
  selected: boolean;
  empty?: boolean;
  onPress: () => void;
  t: TFn;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        borderRadius: 22,
        backgroundColor: selected ? P.sageSoft : P.panel,
        borderWidth: 1,
        borderColor: selected ? P.sage : P.line,
        padding: 10,
        minHeight: 112,
        opacity: empty ? 0.62 : 1,
      }}
    >
      <View
        style={{
          height: 58,
          position: 'relative',
          justifyContent: empty ? 'center' : undefined,
        }}
      >
        {empty ? (
          <Text style={{ color: P.faint, fontSize: 11, fontWeight: '700' }}>{t('today.candidateNone')}</Text>
        ) : (
        pieces.slice(0, 3).map((piece, index) => {
          const image = piece.imageUrl ? { uri: piece.imageUrl } : GARMENT_IMAGES[piece.kind];
          return (
          <View
            key={`${piece.itemId ?? piece.kind}-${index}`}
            style={{
              position: 'absolute',
              left: index * 28,
              top: index * 7,
              transform: [{ rotate: piece.rotate ?? '0deg' }, { scale: 0.72 }],
            }}
          >
            {image ? (
              <Image
                source={image}
                resizeMode="contain"
                style={{ width: 50, height: 50, borderRadius: 12 }}
              />
            ) : (
              <GarmentSvg kind={piece.kind} size={46} />
            )}
          </View>
          );
        })
        )}
      </View>
      <Text numberOfLines={1} style={{ color: P.ink, fontSize: 13, fontWeight: '700', marginTop: 4 }}>
        {t(`today.preset.${strategyKey}.title`)}
      </Text>
      <Text numberOfLines={1} style={{ color: P.muted, fontSize: 10, marginTop: 2 }}>
        {empty
          ? t('today.candidateUnlock')
          : t('today.candidateMeta', {
              minutes: preset.prepMinutes,
              signal: t(`today.preset.${strategyKey}.signal`),
            })}
      </Text>
    </Pressable>
  );
}

export function TodayScreen({ navigation }: Props) {
  const { t, tEnum } = useT();
  const [strategy, setStrategy] = useState<StrategyKey>('safe');
  const { width, height } = useWindowDimensions();
  const track = useTrack();
  const qc = useQueryClient();
  const showToast = useToastStore((state) => state.show);
  const maxWidth = Math.min(width, 520);

  const settingsQuery = useQuery({
    queryKey: ['userSettings'],
    queryFn: getUserSettings,
    staleTime: 5 * 60 * 1000,
  });

  const todayQuery = useQuery({
    queryKey: ['todayRecommendation'],
    queryFn: () => getTodayRecommendation('commute'),
    staleTime: 60 * 1000,
    retry: 1,
  });

  // Pull fresh weather every time the user re-enters the home screen. The
  // backend backfills live weather into GET /today (Redis-cached, no LLM, no
  // refresh quota), so weather tracks the current location without being tied
  // to daily-recommendation generation. Skip the initial focus (already fetched
  // on mount) to avoid a redundant second request.
  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      void qc.invalidateQueries({ queryKey: ['todayRecommendation'] });
    }, [qc]),
  );

  const recommendedItemIds = useMemo(
    () => Array.from(new Set((todayQuery.data?.outfits ?? []).flatMap((outfit) => outfit.items.map((item) => item.id)))),
    [todayQuery.data],
  );

  const itemQueries = useQueries({
    queries: recommendedItemIds.map((id) => ({
      queryKey: ['wardrobeItem', id],
      queryFn: () => getWardrobeItem(id),
      staleTime: 60 * 1000,
    })),
  });

  const refreshMutation = useMutation({
    mutationFn: () => refreshTodayRecommendation('commute'),
    onSuccess: (data) => {
      qc.setQueryData(['todayRecommendation'], data);
      showToast({ message: t('today.swapped'), kind: 'success' });
    },
    onError: (err: { response?: { status?: number } }) => {
      if (err?.response?.status === 429) {
        showToast({ message: t('today.refreshExhausted'), kind: 'error' });
      }
    },
  });

  const outfitsByKey = useMemo(() => {
    const map = new Map<StrategyKey, OutfitSummary>();
    for (const outfit of todayQuery.data?.outfits ?? []) {
      const key = asStrategyKey(outfit.variant);
      if (!map.has(key)) map.set(key, outfit);
    }
    return map;
  }, [todayQuery.data]);

  const itemById = new Map<string, WardrobeItem>();
  for (const query of itemQueries) {
    if (query.data) itemById.set(query.data.id, query.data);
  }

  const departureTime = settingsQuery.data?.departureTime ?? null;
  const remaining = useRemainingMinutes(departureTime);
  const weather = todayQuery.data?.context?.weather ?? null;
  const scene = sceneLabel(t, todayQuery.data?.context?.scene ?? null);
  const tier = weather ? weatherTier(weather) : null;
  const wxTheme = tier ? WX_THEME[tier] : null;
  const candidateMeta = weather
    ? [weather.locationName, windLabel(t, weather)].filter(Boolean).join(' · ') || scene
    : scene;
  const preset = PRESETS[strategy];
  const apiOutfit = outfitsByKey.get(strategy);
  // Single source of truth for the board's honest state (see todayBoard.ts):
  //  - 'insufficient' — backend signalled insufficient_items → forced empty UI
  //  - 'empty'        — no real outfit for this variant (incl. new/empty wardrobe)
  //  - 'real'         — a real API outfit is present → render + enable actions
  // Only 'real' is actionable; 'insufficient'/'empty' never render showcase
  // pieces as a recommendation and never navigate with a non-real id.
  const boardMode = todayBoardMode({
    state: todayQuery.data?.state,
    hasApiOutfit: Boolean(apiOutfit?.id),
  });
  const boardIsReal = boardMode === 'real';
  const guidanceText = todayQuery.data?.guidanceText ?? null;
  const visualPieces = resolveOutfitPieces(apiOutfit, preset, itemById);
  const title = boardIsReal
    ? apiOutfit?.title || t(`today.preset.${strategy}.title`)
    : t('today.noVariant');
  const timeHint = remaining > 0 ? t('today.minutesLeft', { count: remaining }) : t('today.leaveNow');

  const riseAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    riseAnim.setValue(0);
    Animated.timing(riseAnim, { toValue: 1, duration: motion.duration.slow, delay: 40, useNativeDriver: false }).start();
  }, [riseAnim, strategy]);

  useEffect(() => {
    track('today_viewed', { strategy });
  }, [strategy, track]);

  const handleWear = () => {
    if (!boardIsReal || !apiOutfit?.id) return;
    track('outfit_worn', { strategy, outfitId: apiOutfit.id });
    navigation.navigate('OutfitDetail', { outfitId: apiOutfit.id });
  };

  const handleRefresh = () => {
    refreshMutation.mutate();
  };

  // Concept A — basic outfit share (a real board, no selfie). API_GAP[FE#15]:
  // the backend has no share-asset/export endpoint (only GET
  // /v1/outfit-visual-assets/{id}; no POST that renders a shareable board from
  // an outfit_id), and rasterizing the React view would need a native
  // image-export dep that's out of scope. Until that lands, hand a plain
  // text+title to the native share sheet — no fake permanent artifact.
  // Disabled for the local mock showcase and empty/insufficient variants
  // (nothing real to share).
  const canShare = boardIsReal && Boolean(apiOutfit?.id);
  const handleShare = async () => {
    if (!canShare || !apiOutfit?.id) return;
    await shareWithAsset(t('today.shareMessage', { title }));
    track('outfit_shared', { strategy, outfitId: apiOutfit.id });
  };

  return (
    <View style={{ flex: 1, backgroundColor: wxTheme?.bottom ?? P.bg }}>
      {weather ? <WeatherBackdrop {...weather} width={width} height={height} /> : null}
      <ScrollView
        style={{ flex: 1, backgroundColor: 'transparent' }}
        contentContainerStyle={{ alignItems: 'center', paddingBottom: 108 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          // The swap button is a small icon many users miss — pull-to-refresh is
          // the discoverable way to regenerate today (picks up a new city/weather).
          <RefreshControl
            refreshing={refreshMutation.isPending}
            onRefresh={handleRefresh}
            tintColor={P.blue}
            colors={[P.blue]}
          />
        }
      >
      <View style={{ width: maxWidth, paddingHorizontal: 18, paddingTop: 52 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ color: P.faint, fontSize: 11, fontWeight: '800', letterSpacing: 2.4 }}>AIDROBE</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <StrategyRail active={strategy} onChange={setStrategy} tEnum={tEnum} />
            <Pressable
              onPress={() => navigation.navigate('OutfitCalendar')}
              accessibilityRole="button"
              accessibilityLabel={t('today.openCalendar')}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: P.panel,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: P.line,
              }}
            >
              <SystemIcon name="calendar" size={17} color={P.ink} />
            </Pressable>
          </View>
        </View>

        <Animated.View
          style={{
            marginTop: 18,
            opacity: riseAnim,
            transform: [{ translateY: riseAnim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
          }}
        >
          <View style={{ flexDirection: 'row', gap: 14, alignItems: 'stretch' }}>
            {weather && wxTheme ? <WeatherRibbon weather={weather} theme={wxTheme} t={t} /> : null}

            <View style={{ flex: 1 }}>
              {boardIsReal ? <OutfitBoard pieces={visualPieces} /> : <EmptyCanvas t={t} />}
            </View>
          </View>

          <View
            style={{
              marginTop: -10,
              borderRadius: 30,
              backgroundColor: P.panel,
              padding: 16,
              borderWidth: 1,
              borderColor: P.line,
              ...shadow.soft,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 }}>
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={{ color: P.ink, fontSize: 20, fontWeight: '800', letterSpacing: -0.2 }}>
                  {title}
                </Text>
                <Text numberOfLines={2} style={{ color: P.muted, fontSize: 12, lineHeight: 17, marginTop: 4 }}>
                  {boardIsReal
                    ? [
                        weather ? climateAdvice(t, weather) : null,
                        t(`today.preset.${strategy}.signal`),
                        timeHint,
                      ]
                        .filter(Boolean)
                        .join(' · ')
                    : t('today.needMoreItems')}
                </Text>
              </View>
              {boardIsReal ? (
                <View
                  style={{
                    minWidth: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: P.sageSoft,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <SystemIcon name={preset.icon} size={18} color={P.sage} strokeWidth={2.1} />
                  <Text style={{ color: P.sage, fontSize: 9, fontWeight: '800', marginTop: 1 }}>
                    {t('today.prepMinutes', { minutes: preset.prepMinutes })}
                  </Text>
                </View>
              ) : null}
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <Pressable
                onPress={boardIsReal ? handleWear : undefined}
                disabled={!boardIsReal}
                style={({ pressed }) => ({
                  flex: 1,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: boardIsReal ? P.ink : P.line,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed ? 0.86 : 1,
                })}
              >
                <Text style={{ color: boardIsReal ? colors.inverse : P.faint, fontSize: 14, fontWeight: '800' }}>
                  {t('today.wearThis')}
                </Text>
              </Pressable>
              <Pressable
                onPress={handleRefresh}
                disabled={refreshMutation.isPending}
                accessibilityRole="button"
                accessibilityLabel={t('today.swapAnother')}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: P.blueSoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: refreshMutation.isPending ? 0.85 : 1,
                }}
              >
                {refreshMutation.isPending ? (
                  // Shared motion language: the small orb signals the swap is in
                  // flight instead of a static dimmed icon.
                  <AIOrb variant="thinking" size={24} />
                ) : (
                  <SystemIcon name="refresh" size={18} color={P.blue} strokeWidth={2.1} />
                )}
              </Pressable>
              <Pressable
                onPress={canShare ? handleShare : undefined}
                disabled={!canShare}
                accessibilityRole="button"
                accessibilityLabel={t('today.shareThis')}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: P.sageSoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: canShare ? 1 : 0.5,
                }}
              >
                <SystemIcon name="share" size={18} color={P.sage} strokeWidth={2.1} />
              </Pressable>
              <Pressable
                onPress={
                  boardIsReal && apiOutfit?.id
                    ? () => navigation.navigate('OutfitDetail', { outfitId: apiOutfit.id })
                    : undefined
                }
                disabled={!boardIsReal}
                accessibilityRole="button"
                accessibilityLabel={t('today.viewDetail')}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: P.wash,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: boardIsReal ? 1 : 0.5,
                }}
              >
                <SystemIcon name="chevronRight" size={18} color={P.ink} strokeWidth={2.1} />
              </Pressable>
            </View>
          </View>
        </Animated.View>

        <View style={{ marginTop: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <Text style={{ color: P.ink, fontSize: 13, fontWeight: '800' }}>{t('today.candidates')}</Text>
            {candidateMeta ? (
              <Text style={{ color: P.faint, fontSize: 10, fontWeight: '700', letterSpacing: 1 }}>{candidateMeta}</Text>
            ) : null}
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {STRATEGY_ORDER.map((key) => (
              <CompactCandidate
                key={key}
                preset={PRESETS[key]}
                strategyKey={key}
                pieces={resolveOutfitPieces(outfitsByKey.get(key), PRESETS[key], itemById)}
                selected={key === strategy}
                empty={
                  todayBoardMode({
                    state: todayQuery.data?.state,
                    hasApiOutfit: Boolean(outfitsByKey.get(key)?.id),
                  }) !== 'real'
                }
                onPress={() => setStrategy(key)}
                t={t}
              />
            ))}
          </View>
        </View>

        {guidanceText && todayQuery.data?.state !== 'insufficient_items' ? (
          <View
            style={{
              marginTop: 16,
              borderRadius: radius.lg,
              backgroundColor: P.blueSoft,
              padding: 14,
              borderWidth: 1,
              borderColor: P.line,
            }}
          >
            <Text style={{ color: P.ink, fontSize: 13, fontWeight: '700' }}>{guidanceText}</Text>
          </View>
        ) : null}

        {todayQuery.data?.state === 'insufficient_items' ? (
          <View
            style={{
              marginTop: 16,
              borderRadius: radius.lg,
              backgroundColor: colors.warningBg,
              padding: 14,
              borderWidth: 1,
              borderColor: colors.warning,
            }}
          >
            <Text style={{ color: colors.label, fontSize: 13, fontWeight: '700' }}>{t('today.notEnoughData')}</Text>
            <Text style={{ color: colors.secondaryLabel, fontSize: 12, lineHeight: 18, marginTop: 4 }}>
              {t('today.notEnoughData.hint')}
            </Text>
          </View>
        ) : null}
      </View>
      </ScrollView>
    </View>
  );
}
