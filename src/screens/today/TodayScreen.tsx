import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Image,
  type ImageSourcePropType,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { getTodayRecommendation, refreshTodayRecommendation } from '@/api/recommendations';
import { getUserSettings } from '@/api/settings';
import { getWardrobeItem } from '@/api/wardrobe';
import bagCreamTote from '@/assets/wardrobe/bag-cream-tote.png';
import bottomIndigoJeans from '@/assets/wardrobe/bottom-indigo-jeans.png';
import bottomIvoryTrousers from '@/assets/wardrobe/bottom-ivory-trousers.png';
import shoesWhiteCanvas from '@/assets/wardrobe/shoes-white-canvas.png';
import topCreamShirt from '@/assets/wardrobe/top-cream-shirt.png';
import topOatKnit from '@/assets/wardrobe/top-oat-knit.png';
import { GarmentSvg } from '@/components/ui/GarmentSvg';
import { SystemIcon } from '@/components/ui/SystemIcon';
import { useTrack } from '@/hooks/useTrack';
import { useToastStore } from '@/store/toast';
import { colors, radius, shadow } from '@/theme/design';
import type { ItemCategory, OutfitSummary, OutfitVariant, WardrobeItem, WeatherContext } from '@/types/api';
import type { MainTabsParamList, TodayStackParamList } from '@/types/navigation';

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
type GarmentKind =
  | 'shirt'
  | 'blazer'
  | 'trousers'
  | 'sweater'
  | 'jeans'
  | 'dress'
  | 'skirt'
  | 'tee'
  | 'loafer'
  | 'sneaker'
  | 'bag';
type GarmentPiece = {
  kind: GarmentKind;
  x: number;
  y: number;
  scale: number;
  rotate?: string;
  itemId?: string;
  imageUrl?: string | null;
  name?: string | null;
};

type StrategyPreset = {
  title: string;
  label: string;
  signal: string;
  icon: 'shield' | 'clock' | 'sparkle';
  pieces: GarmentPiece[];
  prepMinutes: number;
  reason: string;
};

const MOCK_WEATHER: WeatherContext & { humidity: number; wind: string; location: string } = {
  temperatureC: 24,
  feelsLikeC: 23,
  rainProbability: 0.62,
  condition: 'light rain',
  humidity: 78,
  wind: 'NE 8',
  location: 'Shanghai',
};

const GARMENT_IMAGES: Partial<Record<GarmentKind, ImageSourcePropType>> = {
  shirt: topCreamShirt as ImageSourcePropType,
  trousers: bottomIvoryTrousers as ImageSourcePropType,
  sweater: topOatKnit as ImageSourcePropType,
  jeans: bottomIndigoJeans as ImageSourcePropType,
  sneaker: shoesWhiteCanvas as ImageSourcePropType,
  bag: bagCreamTote as ImageSourcePropType,
};

const PRESETS: Record<StrategyKey, StrategyPreset> = {
  safe: {
    title: '雨天通勤',
    label: '稳',
    signal: '防潮外层',
    icon: 'shield',
    pieces: [
      { kind: 'shirt', x: 8, y: 14, scale: 1.12, rotate: '-7deg' },
      { kind: 'trousers', x: 128, y: 128, scale: 1.24, rotate: '2deg' },
      { kind: 'bag', x: 8, y: 284, scale: 0.72, rotate: '7deg' },
      { kind: 'sneaker', x: 208, y: 292, scale: 0.78, rotate: '-5deg' },
    ],
    prepMinutes: 8,
    reason: '深色外层压住雨天湿冷感，鞋面更好打理。',
  },
  fast: {
    title: '五分钟出门',
    label: '快',
    signal: '少翻找',
    icon: 'clock',
    pieces: [
      { kind: 'sweater', x: 28, y: 18, scale: 1.22, rotate: '-4deg' },
      { kind: 'jeans', x: 132, y: 154, scale: 1.26, rotate: '3deg' },
      { kind: 'sneaker', x: 206, y: 300, scale: 0.82, rotate: '-6deg' },
    ],
    prepMinutes: 5,
    reason: '只拿高频单品，减少搭配决策。',
  },
  stylish: {
    title: '银蓝冷调',
    label: '型',
    signal: '轮廓更清晰',
    icon: 'sparkle',
    pieces: [
      { kind: 'shirt', x: 2, y: 22, scale: 1.08, rotate: '-8deg' },
      { kind: 'trousers', x: 132, y: 126, scale: 1.22, rotate: '2deg' },
      { kind: 'bag', x: 10, y: 282, scale: 0.74, rotate: '7deg' },
      { kind: 'sneaker', x: 210, y: 292, scale: 0.78, rotate: '-5deg' },
    ],
    prepMinutes: 12,
    reason: '保留低饱和底色，用外套线条做记忆点。',
  },
};

const STRATEGY_ORDER: StrategyKey[] = ['safe', 'fast', 'stylish'];
const CANVAS_W = 320;
const CANVAS_H = 420;
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

function normalizeWeather(weather?: WeatherContext | null) {
  if (!weather) return MOCK_WEATHER;
  return {
    ...MOCK_WEATHER,
    ...weather,
    humidity: MOCK_WEATHER.humidity,
    wind: MOCK_WEATHER.wind,
    location: MOCK_WEATHER.location,
  };
}

function weatherLabel(condition: string) {
  const c = condition.toLowerCase();
  if (c.includes('rain')) return '轻雨';
  if (c.includes('cloud')) return '多云';
  if (c.includes('sun') || c.includes('clear')) return '晴';
  return condition;
}

function climateAdvice(weather: ReturnType<typeof normalizeWeather>) {
  if (weather.rainProbability >= 0.5) return '防水鞋面';
  if (weather.temperatureC >= 28) return '轻薄透气';
  if (weather.temperatureC <= 12) return '叠穿保温';
  return '轻外套';
}

function WeatherRibbon({ weather }: { weather: ReturnType<typeof normalizeWeather> }) {
  const rain = Math.round(weather.rainProbability * 100);
  return (
    <View
      style={{
        width: 58,
        borderRadius: 29,
        backgroundColor: P.blueSoft,
        alignItems: 'center',
        paddingVertical: 16,
        gap: 14,
      }}
    >
      <Text style={{ color: P.ink, fontSize: 20, fontWeight: '700' }}>{Math.round(weather.temperatureC)}°</Text>
      <View style={{ width: 1, height: 92, backgroundColor: P.blue }} />
      <View style={{ alignItems: 'center', gap: 3 }}>
        <Text style={{ color: P.blue, fontSize: 11, fontWeight: '700', letterSpacing: 0.8 }}>{rain}%</Text>
        <Text style={{ color: P.muted, fontSize: 10 }}>rain</Text>
      </View>
      <View style={{ alignItems: 'center', gap: 3 }}>
        <Text style={{ color: P.ink, fontSize: 12, fontWeight: '700' }}>{weatherLabel(weather.condition)}</Text>
        <Text style={{ color: P.muted, fontSize: 10 }}>{weather.humidity}%</Text>
      </View>
    </View>
  );
}

function StrategyRail({
  active,
  onChange,
}: {
  active: StrategyKey;
  onChange: (key: StrategyKey) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {STRATEGY_ORDER.map((key) => {
        const preset = PRESETS[key];
        const selected = key === active;
        return (
          <Pressable
            key={key}
            onPress={() => onChange(key)}
            accessibilityRole="button"
            accessibilityLabel={preset.title}
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
            <Text style={{ color: selected ? '#fff' : P.muted, fontSize: 13, fontWeight: '700' }}>{preset.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function AnimatedPiece({
  piece,
  delay,
  factor,
  piecesKey,
}: {
  piece: GarmentPiece;
  delay: number;
  factor: number;
  piecesKey: string;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  const image = piece.imageUrl ? { uri: piece.imageUrl } : GARMENT_IMAGES[piece.kind];
  const size = 132 * factor;

  useEffect(() => {
    anim.setValue(0);
    Animated.timing(anim, { toValue: 1, duration: 520, delay, useNativeDriver: false }).start();
  }, [anim, delay, piecesKey]);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: piece.x * factor,
        top: piece.y * factor,
        opacity: anim,
        transform: [
          { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) },
          { rotate: piece.rotate ?? '0deg' },
          { scale: piece.scale },
        ],
      }}
    >
      {image ? (
        <Image
          source={image}
          resizeMode="contain"
          style={{
            width: size,
            height: size,
            borderRadius: 30 * factor,
          }}
        />
      ) : (
        <GarmentSvg kind={piece.kind} size={112 * factor} />
      )}
    </Animated.View>
  );
}

function OutfitCanvas({ pieces }: { pieces: GarmentPiece[] }) {
  const [width, setWidth] = useState(0);
  const factor = Math.min(1.18, Math.max(0.82, width / CANVAS_W));
  const piecesKey = pieces.map((piece) => `${piece.itemId ?? piece.kind}:${piece.imageUrl ?? ''}`).join('-');

  return (
    <View
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={{
        flex: 1,
        minHeight: CANVAS_H * factor,
        position: 'relative',
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
          opacity: 0.72,
        }}
      />
      {width > 0
        ? pieces.map((piece, index) => (
            <AnimatedPiece
              key={`${piece.itemId ?? piece.kind}-${index}`}
              piece={piece}
              delay={index * 70}
              factor={factor}
              piecesKey={piecesKey}
            />
          ))
        : null}
    </View>
  );
}

function CompactCandidate({
  preset,
  pieces,
  selected,
  onPress,
}: {
  preset: StrategyPreset;
  pieces: GarmentPiece[];
  selected: boolean;
  onPress: () => void;
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
      }}
    >
      <View style={{ height: 58, position: 'relative' }}>
        {pieces.slice(0, 3).map((piece, index) => {
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
        })}
      </View>
      <Text numberOfLines={1} style={{ color: P.ink, fontSize: 13, fontWeight: '700', marginTop: 4 }}>
        {preset.title}
      </Text>
      <Text numberOfLines={1} style={{ color: P.muted, fontSize: 10, marginTop: 2 }}>
        {preset.prepMinutes} 分钟 · {preset.signal}
      </Text>
    </Pressable>
  );
}

export function TodayScreen({ navigation }: Props) {
  const [strategy, setStrategy] = useState<StrategyKey>('safe');
  const { width } = useWindowDimensions();
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
      showToast({ message: '已换一套', kind: 'success' });
    },
    onError: (err: { response?: { status?: number } }) => {
      if (err?.response?.status === 429) {
        showToast({ message: '今天的刷新次数用完了', kind: 'error' });
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
  const weather = normalizeWeather(todayQuery.data?.context?.weather);
  const preset = PRESETS[strategy];
  const apiOutfit = outfitsByKey.get(strategy);
  const visualPieces = resolveOutfitPieces(apiOutfit, preset, itemById);
  const title = apiOutfit?.title || preset.title;
  const outfitId = apiOutfit?.id ?? 'local-showcase';
  const timeHint = remaining > 0 ? `余 ${remaining} 分钟` : '现在出门';

  const riseAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    riseAnim.setValue(0);
    Animated.timing(riseAnim, { toValue: 1, duration: 420, delay: 40, useNativeDriver: false }).start();
  }, [riseAnim, strategy]);

  useEffect(() => {
    track('today_viewed', { strategy });
  }, [strategy, track]);

  const handleWear = () => {
    track('outfit_worn', { strategy, outfitId });
    navigation.navigate('OutfitDetail', { outfitId });
  };

  const handleRefresh = () => {
    refreshMutation.mutate();
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: P.bg }}
      contentContainerStyle={{ alignItems: 'center', paddingBottom: 108 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ width: maxWidth, paddingHorizontal: 18, paddingTop: 52 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ color: P.faint, fontSize: 11, fontWeight: '800', letterSpacing: 2.4 }}>AIDROBE</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <StrategyRail active={strategy} onChange={setStrategy} />
            <Pressable
              onPress={() => navigation.navigate('OutfitCalendar')}
              accessibilityRole="button"
              accessibilityLabel="打开穿搭日历"
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
            <WeatherRibbon weather={weather} />

            <View style={{ flex: 1 }}>
              <OutfitCanvas pieces={visualPieces} />
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
                  {climateAdvice(weather)} · {preset.signal} · {timeHint}
                </Text>
              </View>
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
                <Text style={{ color: P.sage, fontSize: 9, fontWeight: '800', marginTop: 1 }}>{preset.prepMinutes}m</Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <Pressable
                onPress={handleWear}
                style={({ pressed }) => ({
                  flex: 1,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: P.ink,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed ? 0.86 : 1,
                })}
              >
                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '800' }}>穿这套</Text>
              </Pressable>
              <Pressable
                onPress={handleRefresh}
                disabled={refreshMutation.isPending}
                accessibilityRole="button"
                accessibilityLabel="换一套"
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: P.blueSoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: refreshMutation.isPending ? 0.5 : 1,
                }}
              >
                <SystemIcon name="refresh" size={18} color={P.blue} strokeWidth={2.1} />
              </Pressable>
              <Pressable
                onPress={() => navigation.navigate('OutfitDetail', { outfitId })}
                accessibilityRole="button"
                accessibilityLabel="查看详情"
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: P.wash,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <SystemIcon name="chevronRight" size={18} color={P.ink} strokeWidth={2.1} />
              </Pressable>
            </View>
          </View>
        </Animated.View>

        <View style={{ marginTop: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <Text style={{ color: P.ink, fontSize: 13, fontWeight: '800' }}>候选</Text>
            <Text style={{ color: P.faint, fontSize: 10, fontWeight: '700', letterSpacing: 1 }}>
              {weather.location} · {weather.wind}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {STRATEGY_ORDER.map((key) => (
              <CompactCandidate
                key={key}
                preset={PRESETS[key]}
                pieces={resolveOutfitPieces(outfitsByKey.get(key), PRESETS[key], itemById)}
                selected={key === strategy}
                onPress={() => setStrategy(key)}
              />
            ))}
          </View>
        </View>

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
            <Text style={{ color: colors.label, fontSize: 13, fontWeight: '700' }}>衣橱数据还不够</Text>
            <Text style={{ color: colors.secondaryLabel, fontSize: 12, lineHeight: 18, marginTop: 4 }}>
              先补几件上衣、下装和鞋，推荐会更准。
            </Text>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}
