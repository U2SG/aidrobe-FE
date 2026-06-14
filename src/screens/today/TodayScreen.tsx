import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, Text, View } from 'react-native';

import { getTodayRecommendation, refreshTodayRecommendation } from '@/api/recommendations';
import { getUserSettings } from '@/api/settings';
import { useToastStore } from '@/store/toast';
import { CountdownRing } from '@/components/ui/CountdownRing';
import { GarmentSvg } from '@/components/ui/GarmentSvg';
import { SystemIcon } from '@/components/ui/SystemIcon';
import { Tag } from '@/components/ui/Tag';
import { useGenUIStream } from '@/hooks/useGenUIStream';
import { GenUIRenderer } from '@/lib/genui/renderer';
import { useTrack } from '@/hooks/useTrack';
import { colors, radius, shadow } from '@/theme/design';
import type { OutfitSummary, OutfitVariant } from '@/types/api';
import type { MainTabsParamList, TodayStackParamList } from '@/types/navigation';

type Props = CompositeScreenProps<
  NativeStackScreenProps<TodayStackParamList, 'Today'>,
  BottomTabScreenProps<MainTabsParamList>
>;

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
  warn: colors.warning,
  red: colors.danger,
  shadowSm: shadow.soft,
  shadowMd: shadow.elevated,
};

type StrategyKey = 'safe' | 'fast' | 'stylish';

type GarmentKind = 'shirt' | 'blazer' | 'trousers' | 'sweater' | 'jeans' | 'skirt' | 'loafer' | 'sneaker' | 'bag';
type GarmentPiece = { kind: GarmentKind; x: number; y: number; scale: number };

// Client-side visual + presentation presets.
// Backend currently does not return: pieces layout, prepMinutes, timeLabel, sub, icon, tags.
// title/reason/items come from API; we fall back to the preset defaults if API not yet ready.
type StrategyPreset = {
  title: string;
  sub: string;
  icon: 'shield' | 'clock' | 'sparkle';
  pieces: GarmentPiece[];
  prepMinutes: number;
  timeLabel: string;
  tags: string[];
  reason: string;
};

const PRESETS: Record<StrategyKey, StrategyPreset> = {
  safe: {
    title: '最稳妥',
    sub: '适合大多数通勤场合',
    icon: 'shield',
    pieces: [
      { kind: 'shirt', x: 30, y: 40, scale: 1.1 },
      { kind: 'blazer', x: 175, y: 30, scale: 1.15 },
      { kind: 'trousers', x: 90, y: 175, scale: 1.05 },
      { kind: 'loafer', x: 195, y: 240, scale: 0.85 },
    ],
    prepMinutes: 8,
    timeLabel: 'STANDARD',
    tags: ['主衣柜可取', '无需熨烫', '黑白经典'],
    reason: '延续你常喜欢的黑白通勤风格，整体干净利落。',
  },
  fast: {
    title: '最省时',
    sub: '5 分钟搞定出门',
    icon: 'clock',
    pieces: [
      { kind: 'sweater', x: 60, y: 50, scale: 1.1 },
      { kind: 'jeans', x: 100, y: 175, scale: 1.05 },
      { kind: 'sneaker', x: 175, y: 260, scale: 0.85 },
    ],
    prepMinutes: 5,
    timeLabel: 'RUSHED',
    tags: ['主衣柜可取', '近期常穿', '免熨烫'],
    reason: '都是你最近一周穿过的单品，无需翻找。',
  },
  stylish: {
    title: '更有风格',
    sub: '简约高级感',
    icon: 'sparkle',
    pieces: [
      { kind: 'shirt', x: 30, y: 50, scale: 1.0 },
      { kind: 'blazer', x: 175, y: 30, scale: 1.2 },
      { kind: 'skirt', x: 95, y: 180, scale: 1.05 },
      { kind: 'loafer', x: 195, y: 250, scale: 0.85 },
      { kind: 'bag', x: 30, y: 230, scale: 0.7 },
    ],
    prepMinutes: 12,
    timeLabel: 'RELAXED',
    tags: ['含咖色半裙', '需取玄关包', '低饱和配色'],
    reason: '在你偏好的低饱和米咖色里加一点比例变化。',
  },
};

const STRATEGY_ORDER: StrategyKey[] = ['safe', 'fast', 'stylish'];

function asStrategyKey(variant: OutfitVariant): StrategyKey {
  const v = String(variant);
  if (v === 'safe' || v === 'fast' || v === 'stylish') return v;
  return 'safe';
}

function useRemainingMinutes(departureTime: string | null): number {
  const now = new Date();
  if (!departureTime) return 38;
  const parts = departureTime.split(':');
  const h = Number(parts[0] ?? 8);
  const m = Number(parts[1] ?? 30);
  const dep = new Date(now);
  dep.setHours(h, m, 0, 0);
  const diff = Math.round((dep.getTime() - now.getTime()) / 60000);
  return Math.max(0, Math.min(90, diff));
}

function StrategyIconInline({ icon, active }: { icon: 'shield' | 'clock' | 'sparkle'; active?: boolean }) {
  const c = active ? T.ink : T.ink3;
  return <SystemIcon name={icon} size={18} color={c} strokeWidth={1.9} />;
}

function StrategyTabs({
  active,
  onChange,
}: {
  active: StrategyKey;
  onChange: (k: StrategyKey) => void;
}) {
  const tabs: { id: StrategyKey; label: string }[] = [
    { id: 'safe', label: '最稳妥' },
    { id: 'fast', label: '最省时' },
    { id: 'stylish', label: '更有风格' },
  ];
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: T.cardSoft,
        borderRadius: radius.pill,
        padding: 4,
        marginHorizontal: 20,
      }}
    >
      {tabs.map((t) => (
        <Pressable
          key={t.id}
          onPress={() => onChange(t.id)}
          style={{
            flex: 1,
            paddingVertical: 10,
            borderRadius: radius.pill,
            backgroundColor: active === t.id ? '#fff' : 'transparent',
            alignItems: 'center',
            ...(active === t.id ? T.shadowSm : {}),
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: active === t.id ? '600' : '500', color: active === t.id ? T.ink : T.ink3 }}>
            {t.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function TimeBudgetBar({ prepMinutes, remaining }: { prepMinutes: number; remaining: number }) {
  const fits = prepMinutes <= remaining;
  const ratio = Math.min(1, prepMinutes / Math.max(remaining, 1));
  const slack = Math.max(0, remaining - prepMinutes);
  const color = !fits ? T.red : ratio > 0.6 ? T.warn : T.ok;
  return (
    <View style={{ marginTop: 6 }}>
      <View style={{ height: 6, backgroundColor: T.divider, borderRadius: 3, overflow: 'hidden' }}>
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            width: `${ratio * 100}%`,
            backgroundColor: color,
            borderRadius: 3,
          }}
        />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
        <Text style={{ fontSize: 9, color, fontFamily: 'monospace' }}>准备 {prepMinutes}′</Text>
        <Text style={{ fontSize: 9, color: T.ink3, fontFamily: 'monospace' }}>
          {fits ? `余 ${slack}′` : `超 ${prepMinutes - remaining}′`}
        </Text>
      </View>
    </View>
  );
}

// PRESETS 的 pieces 坐标按 280×320 的设计画布摆放；实际画布更窄时整体等比缩放。
const CANVAS_DESIGN_W = 280;
const CANVAS_DESIGN_H = 320;

function AnimatedPiece({
  piece,
  delay,
  piecesKey,
  factor,
}: {
  piece: GarmentPiece;
  delay: number;
  piecesKey: string;
  factor: number;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    anim.setValue(0);
    Animated.timing(anim, { toValue: 1, duration: 600, delay, useNativeDriver: false }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [piecesKey]);
  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: piece.x * factor,
        top: piece.y * factor,
        transform: [
          { scale: piece.scale },
          { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) },
        ],
        opacity: anim,
      }}
    >
      <GarmentSvg kind={piece.kind} size={90 * factor} />
    </Animated.View>
  );
}

function OutfitCanvas({ pieces }: { pieces: GarmentPiece[] }) {
  const piecesKey = pieces.map((p) => p.kind).join('-');
  const [canvasWidth, setCanvasWidth] = useState(0);
  const factor = Math.min(1, canvasWidth / CANVAS_DESIGN_W);
  return (
    <View
      onLayout={(e) => setCanvasWidth(e.nativeEvent.layout.width)}
      style={{ flex: 1, minHeight: CANVAS_DESIGN_H * (factor || 1), position: 'relative' }}
    >
      {canvasWidth > 0 &&
        pieces.map((p, i) => (
          <AnimatedPiece
            key={`${p.kind}-${i}`}
            piece={p}
            delay={i * 80 + 80}
            piecesKey={piecesKey}
            factor={factor}
          />
        ))}
    </View>
  );
}

function MiniOutfitCard({
  title,
  sub,
  pieces,
  location,
  time,
  onPress,
}: {
  title: string;
  sub: string;
  pieces: GarmentPiece[];
  location: string;
  time: string;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={{ flex: 1 }}>
      <View style={{ backgroundColor: T.card, borderRadius: radius.lg, padding: 14, ...T.shadowSm }}>
        <View style={{ height: 110, backgroundColor: T.cardInner, borderRadius: radius.md, overflow: 'hidden', position: 'relative' }}>
          {pieces.map((p, i) => (
            <View key={i} style={{ position: 'absolute', left: p.x, top: p.y, transform: [{ scale: p.scale }] }}>
              <GarmentSvg kind={p.kind} size={54} />
            </View>
          ))}
        </View>
        <View style={{ marginTop: 8 }}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: T.ink }} numberOfLines={1}>
            {title}
          </Text>
          <Text style={{ fontSize: 11, color: T.ink3, lineHeight: 16, marginTop: 2 }} numberOfLines={2}>
            {sub}
          </Text>
        </View>
        <View style={{ marginTop: 8, gap: 5 }}>
          <Tag style={{ alignSelf: 'flex-start' }}>{location}</Tag>
          <Tag style={{ alignSelf: 'flex-start' }}>{time}</Tag>
        </View>
      </View>
    </Pressable>
  );
}

export function TodayScreen({ navigation }: Props) {
  const [strategy, setStrategy] = useState<StrategyKey>('safe');
  const track = useTrack();
  const qc = useQueryClient();
  const showToast = useToastStore((s) => s.show);
  const { nodes: streamNodes, status: streamStatus, startMock, reset: resetStream } = useGenUIStream();

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

  // V3+ D3 — user-initiated refresh writes a new revision and invalidates the
  // server cache. Local TanStack Query cache must be replaced so the new
  // revision is rendered immediately. 429 = daily limit hit; 503 = flag off.
  const refreshMutation = useMutation({
    mutationFn: () => refreshTodayRecommendation('commute'),
    onSuccess: (data) => {
      qc.setQueryData(['todayRecommendation'], data);
      showToast({ message: '已为你换一套', kind: 'success' });
    },
    onError: (err: { response?: { status?: number } }) => {
      if (err?.response?.status === 429) {
        showToast({ message: '今日刷新次数已用完，明天再来', kind: 'error' });
      }
      // Other errors (503, network, …) handled by the axios interceptor.
    },
  });

  useEffect(() => {
    resetStream();
  }, [strategy, resetStream]);

  const departureTime = settingsQuery.data?.departureTime ?? null;
  const remaining = useRemainingMinutes(departureTime);

  // Group server outfits by strategy key
  const outfitsByKey = useMemo(() => {
    const map = new Map<StrategyKey, OutfitSummary>();
    for (const o of todayQuery.data?.outfits ?? []) {
      const k = asStrategyKey(o.variant);
      if (!map.has(k)) map.set(k, o);
    }
    return map;
  }, [todayQuery.data]);

  const preset = PRESETS[strategy];
  const apiOutfit = outfitsByKey.get(strategy);
  const title = apiOutfit?.title ?? preset.title;
  const reason = apiOutfit?.reason ?? preset.reason;
  const outfitId = apiOutfit?.id ?? 'local-showcase';

  useEffect(() => {
    track('today_viewed', { strategy });
  }, [strategy, track]);

  const handleWear = () => {
    track('outfit_worn', { strategy, outfitId });
    navigation.navigate('OutfitDetail', { outfitId });
  };

  const handleRefresh = () => {
    resetStream();
    startMock(strategy);
    refreshMutation.mutate();
  };

  const isStreaming = streamStatus === 'streaming' || streamStatus === 'done';

  const riseAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    riseAnim.setValue(0);
    Animated.timing(riseAnim, { toValue: 1, duration: 480, delay: 80, useNativeDriver: false }).start();
  }, [strategy, riseAnim]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: T.bg }}
      contentContainerStyle={{ paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
    >
      <View
        style={{
          paddingHorizontal: 24,
          paddingTop: 52,
          paddingBottom: 12,
          flexDirection: 'row',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 30, fontWeight: '600', color: T.ink, letterSpacing: -0.4 }}>早上好</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
            <Text style={{ fontSize: 14, color: T.ink2 }}>距出门还有</Text>
            <Text style={{ fontSize: 22, fontWeight: '600', color: T.accent, letterSpacing: -0.4 }}>{remaining}</Text>
            <Text style={{ fontSize: 14, color: T.ink2 }}>分钟</Text>
          </View>
        </View>
        <CountdownRing minutes={remaining} />
      </View>

      {todayQuery.data?.guidanceText ? (
        <View style={{ paddingHorizontal: 24, paddingBottom: 4 }}>
          <Text style={{ fontSize: 12, color: T.ink3, lineHeight: 18 }}>{todayQuery.data.guidanceText}</Text>
        </View>
      ) : null}

      <View
        style={{
          paddingHorizontal: 24,
          paddingTop: 12,
          paddingBottom: 14,
          flexDirection: 'row',
          alignItems: 'baseline',
          justifyContent: 'space-between',
        }}
      >
        <Text style={{ fontSize: 22, fontWeight: '600', color: T.ink }}>今日穿搭</Text>
        <Text style={{ fontSize: 11, color: T.ink3 }}>
          {(() => {
            const ctx = todayQuery.data?.context;
            const w = ctx?.weather;
            const scene = ctx?.scene ?? '通勤';
            if (w) return `${w.condition} ${Math.round(w.temperatureC)}° · ${scene}`;
            return scene;
          })()}
        </Text>
      </View>

      <StrategyTabs active={strategy} onChange={setStrategy} />

      <Animated.View
        style={{
          marginHorizontal: 16,
          marginTop: 14,
          backgroundColor: T.card,
          borderRadius: radius.xl,
          padding: 18,
          paddingBottom: 14,
          ...T.shadowMd,
          opacity: riseAnim,
          transform: [{ translateY: riseAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
        }}
      >
        {isStreaming ? (
          <View style={{ minHeight: 180, paddingVertical: 4 }}>
            <GenUIRenderer nodes={streamNodes} isStreaming={streamStatus === 'streaming'} />
          </View>
        ) : (
          <>
            <View style={{ flexDirection: 'row' }}>
              <View style={{ width: 80, paddingTop: 6, gap: 14 }}>
                <View>
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: radius.md,
                      backgroundColor: T.cardSoft,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <StrategyIconInline icon={preset.icon} active />
                  </View>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: T.ink, marginTop: 4 }} numberOfLines={1}>
                    {title}
                  </Text>
                  <Text style={{ fontSize: 10, color: T.ink3, lineHeight: 15, marginTop: 2 }} numberOfLines={2}>
                    {preset.sub}
                  </Text>
                </View>

                <View style={{ padding: 9, backgroundColor: T.cardSoft, borderRadius: radius.md }}>
                  <Text
                    style={{ fontSize: 9, color: T.accent, letterSpacing: 0.6, fontWeight: '600', fontFamily: 'monospace' }}
                  >
                    {preset.timeLabel}
                  </Text>
                  <TimeBudgetBar prepMinutes={preset.prepMinutes} remaining={remaining} />
                </View>

                {preset.tags.map((tag) => (
                  <Text key={tag} style={{ fontSize: 10, color: T.ink3, lineHeight: 15 }}>
                    · {tag}
                  </Text>
                ))}
              </View>

              <OutfitCanvas key={strategy} pieces={preset.pieces} />
            </View>

            <View style={{ marginTop: 4, marginBottom: 12, padding: 12, backgroundColor: T.bgAlt, borderRadius: radius.md }}>
              <Text style={{ fontSize: 12, color: T.ink2, lineHeight: 19 }}>
                &ldquo;{reason}&rdquo;
              </Text>
            </View>
          </>
        )}

        <Pressable
          onPress={handleWear}
          style={({ pressed }) => ({
            height: 50,
            backgroundColor: T.ink,
            borderRadius: radius.md,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.88 : 1,
          })}
        >
          <Text style={{ fontSize: 15, fontWeight: '600', color: '#fff' }}>今天穿这套</Text>
        </Pressable>

        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 18, marginTop: 10 }}>
          <Pressable onPress={() => navigation.navigate('OutfitDetail', { outfitId })}>
            <Text style={{ fontSize: 12, color: T.ink3 }}>查看详情</Text>
          </Pressable>
          <Text style={{ color: T.divider }}>|</Text>
          <Pressable>
            <Text style={{ fontSize: 12, color: T.ink3 }}>不喜欢</Text>
          </Pressable>
          <Text style={{ color: T.divider }}>|</Text>
          <Pressable
            onPress={handleRefresh}
            disabled={refreshMutation.isPending || streamStatus === 'streaming'}
          >
            <Text style={{ fontSize: 12, color: (refreshMutation.isPending || streamStatus === 'streaming') ? T.ink4 : T.ink3 }}>
              {(refreshMutation.isPending || streamStatus === 'streaming') ? '生成中…' : '换一套'}
            </Text>
          </Pressable>
        </View>
      </Animated.View>

      <View style={{ padding: 16 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            paddingHorizontal: 8,
            paddingBottom: 8,
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: '600', color: T.ink }}>更多方案</Text>
          <Text style={{ fontSize: 11, color: T.ink3 }}>基于真实衣橱</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {STRATEGY_ORDER.filter((k) => k !== strategy).map((k) => {
            const o = outfitsByKey.get(k);
            const p = PRESETS[k];
            return (
              <MiniOutfitCard
                key={k}
                title={o?.title ?? p.title}
                sub={o?.reason ?? p.reason}
                pieces={p.pieces.slice(0, 3).map((piece, i) => ({
                  ...piece,
                  x: i * 46 + 4,
                  y: i * 22 + 8,
                  scale: 0.6,
                }))}
                location="主衣柜可取"
                time={`约 ${p.prepMinutes} 分钟`}
                onPress={() => o && navigation.navigate('OutfitDetail', { outfitId: o.id })}
              />
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}
