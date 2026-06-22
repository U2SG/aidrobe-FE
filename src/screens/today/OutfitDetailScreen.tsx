import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQueries, useQuery } from '@tanstack/react-query';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';

import { getOutfitDetail, markOutfitWorn } from '@/api/recommendations';
import { getWardrobeItem } from '@/api/wardrobe';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingBlock } from '@/components/feedback/LoadingBlock';
import { GarmentSvg } from '@/components/ui/GarmentSvg';
import { SystemIcon } from '@/components/ui/SystemIcon';
import { Tag } from '@/components/ui/Tag';
import { useTrack } from '@/hooks/useTrack';
import { colors, shadow } from '@/theme/design';
import type { ItemCategory, OutfitObstacle, OutfitScores, WardrobeItem } from '@/types/api';
import type { TodayStackParamList } from '@/types/navigation';
import { renderI18n } from '@/utils/i18n';

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

type GarmentKind = 'shirt' | 'blazer' | 'trousers' | 'sweater' | 'jeans' | 'dress' | 'skirt' | 'tee' | 'loafer' | 'sneaker' | 'bag';

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
      return 'loafer';
    case 'accessory':
      return 'bag';
    default:
      return 'shirt';
  }
}

// Visual hero layout — backend doesn't return positions; client static.
const HERO_LAYOUT: { x: number; y: number; scale: number }[] = [
  { x: 36, y: 30, scale: 1.2 },
  { x: 165, y: 18, scale: 1.3 },
  { x: 90, y: 175, scale: 1.1 },
  { x: 195, y: 250, scale: 0.85 },
  { x: 30, y: 230, scale: 0.7 },
];

type ScoreCell = { label: string; value: string; max?: string; warn?: boolean };

// Score row from server (V3+ B). Falls back to a static placeholder when the
// ENABLE_OUTFIT_SCORES flag is off (server returns null).
function scoreCells(scores: OutfitScores | null | undefined): ScoreCell[] {
  if (!scores) {
    return [
      { label: '美感', value: '—', max: '100' },
      { label: '执行性', value: '—', max: '100' },
      { label: '合身度', value: '—', max: '100' },
      { label: '准备时间', value: '—' },
    ];
  }
  const pct = (n: number) => Math.round(n * 100).toString();
  return [
    { label: '美感', value: pct(scores.aesthetic), max: '100', warn: scores.aesthetic < 0.7 },
    { label: '执行性', value: pct(scores.feasibility), max: '100', warn: scores.feasibility < 0.7 },
    { label: '合身度', value: pct(scores.fit), max: '100', warn: scores.fit < 0.7 },
    { label: '准备时间', value: `${scores.prepMinutes}′`, warn: scores.prepMinutes > 12 },
  ];
}

export function OutfitDetailScreen({ navigation, route }: Props) {
  const { outfitId } = route.params;
  const isLocal = outfitId === 'local-showcase';
  const track = useTrack();

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

  const variant = outfitQuery.data?.variant ?? 'safe';
  const heroTitle = outfitQuery.data?.title ?? '通勤 · 黑白经典';
  const heroReason =
    outfitQuery.data?.reason ?? '延续了你常穿的黑白通勤风格。所有单品都在主衣柜，无需熨烫。';
  const variantLabel = String(variant).toUpperCase();

  // V3+ B — server-provided. Null when flags off.
  const apiScores = outfitQuery.data?.scores ?? null;
  const apiObstacles = outfitQuery.data?.obstacles ?? null;
  const apiPrepSteps = outfitQuery.data?.prepSteps ?? null;
  const apiPrepNotes = outfitQuery.data?.prepNotes ?? null;
  const scores = scoreCells(apiScores);

  // Resolve replacement candidate to a real item (first wearable wins).
  function findReplacement(o: OutfitObstacle): WardrobeItem | null {
    for (const id of o.replacementCandidateIds) {
      const candidate = fullItems.find((it) => it.id === id);
      if (candidate && candidate.status === 'wearable') return candidate;
    }
    return null;
  }

  // Pick the most severe obstacle for the top banner.
  const primaryObstacle = apiObstacles?.find((o) => o.severity === 'blocking')
    ?? apiObstacles?.find((o) => o.severity === 'warning')
    ?? apiObstacles?.[0]
    ?? null;
  const replacement = primaryObstacle ? findReplacement(primaryObstacle) : null;

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <View
        style={{
          paddingTop: 52,
          paddingHorizontal: 16,
          paddingBottom: 6,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
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
            ...T.shadowSm,
          }}
        >
          <SystemIcon name="chevronLeft" size={18} color={T.ink} />
        </Pressable>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: T.card,
              alignItems: 'center',
              justifyContent: 'center',
              ...T.shadowSm,
            }}
          >
            <SystemIcon name="download" size={18} color={T.ink2} />
          </Pressable>
          <Pressable
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: T.card,
              alignItems: 'center',
              justifyContent: 'center',
              ...T.shadowSm,
            }}
          >
            <SystemIcon name="more" size={20} color={T.ink2} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={{ fontSize: 11, color: T.accent, letterSpacing: 1, fontFamily: 'monospace', marginBottom: 4 }}>
          {variantLabel}
        </Text>
        <Text style={{ fontSize: 26, fontWeight: '600', color: T.ink, lineHeight: 32 }}>{heroTitle}</Text>

        {primaryObstacle && (
          <View
            style={{
              marginTop: 14,
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
              {replacement ? (
                <Text style={{ fontSize: 11, color: '#7A6A55', lineHeight: 17, marginBottom: 8 }}>
                  推荐替换为「{replacement.name}」
                  {replacement.location ? `（${replacement.location}）` : ''} — 整体造型不变。
                </Text>
              ) : (
                <Text style={{ fontSize: 11, color: '#7A6A55', lineHeight: 17 }}>
                  当前没有合适的替代单品，建议手动调整。
                </Text>
              )}
              {replacement && (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Pressable
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      backgroundColor: T.ink,
                      borderRadius: 8,
                    }}
                  >
                    <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600' }}>自动替换</Text>
                  </Pressable>
                  <Pressable
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: '#D4B687',
                    }}
                  >
                    <Text style={{ color: '#7A6A55', fontSize: 11 }}>仍然穿这件</Text>
                  </Pressable>
                </View>
              )}
            </View>
          </View>
        )}

        <View
          style={{
            marginTop: 14,
            flexDirection: 'row',
            gap: 14,
            padding: 14,
            backgroundColor: T.card,
            borderRadius: 14,
            ...T.shadowSm,
          }}
        >
          {scores.map((s, i) => (
            <View key={i} style={{ flex: 1, alignItems: 'center' }}>
              {i > 0 && (
                <View
                  style={{
                    position: 'absolute',
                    left: -7,
                    top: 0,
                    bottom: 0,
                    width: 1,
                    backgroundColor: T.divider,
                  }}
                />
              )}
              <Text style={{ fontSize: 22, fontWeight: '600', color: s.warn ? T.red : T.ink, lineHeight: 26 }}>
                {s.value}
                {s.max ? (
                  <Text style={{ fontSize: 11, color: T.ink4, fontWeight: '400' }}>{` / ${s.max}`}</Text>
                ) : null}
              </Text>
              <Text style={{ fontSize: 10, color: T.ink3, marginTop: 4 }}>{s.label}</Text>
            </View>
          ))}
        </View>

        <View
          style={{
            marginTop: 14,
            height: 320,
            backgroundColor: T.card,
            borderRadius: 18,
            ...T.shadowSm,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {(fullItems.length ? fullItems : itemBriefs).map((it, i) => {
            const layout = HERO_LAYOUT[i] ?? HERO_LAYOUT[0]!;
            const fullItem = fullItems[i];
            const imageUrl = fullItem?.imageUrl ?? null;
            return (
              <View
                key={it.id}
                style={{ position: 'absolute', left: layout.x, top: layout.y, transform: [{ scale: layout.scale }] }}
              >
                {imageUrl ? (
                  <Image source={{ uri: imageUrl }} style={{ width: 90, height: 90, borderRadius: 8 }} resizeMode="contain" />
                ) : (
                  <GarmentSvg kind={categoryToGarment(it.category)} size={90} />
                )}
              </View>
            );
          })}
          <View
            style={{
              position: 'absolute',
              left: 16,
              bottom: 16,
              right: 16,
              padding: 12,
              backgroundColor: 'rgba(255,255,255,0.88)',
              borderRadius: 10,
            }}
          >
            <Text style={{ fontSize: 11, color: T.ink2, lineHeight: 17 }}>&ldquo;{heroReason}&rdquo;</Text>
          </View>
        </View>

        <Text style={{ marginTop: 18, fontSize: 12, color: T.ink3, marginBottom: 8 }}>
          这套包含 {itemBriefs.length} 件单品
        </Text>
        <View style={{ gap: 8 }}>
          {(fullItems.length ? fullItems : itemBriefs.map((b) => ({
            id: b.id,
            name: b.name ?? '—',
            category: b.category ?? null,
            color: b.color ?? '',
            imageUrl: null,
            status: 'wearable',
            location: null,
            sizeLabel: null,
            fitStatus: 'unknown',
          } as WardrobeItem))).map((it) => {
            const isLaundry = it.status !== 'wearable';
            return (
              <Pressable
                key={it.id}
                onPress={() => navigation.getParent()?.navigate('WardrobeTab', {
                  screen: 'ItemDetail',
                  params: { itemId: it.id },
                } as never)}
              >
                <View
                  style={{
                    backgroundColor: T.card,
                    borderRadius: 14,
                    padding: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    ...T.shadowSm,
                    borderWidth: isLaundry ? 1 : 0,
                    borderColor: isLaundry ? '#E5D2A8' : 'transparent',
                    opacity: isLaundry ? 0.85 : 1,
                  }}
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
                    {it.imageUrl ? (
                      <Image source={{ uri: it.imageUrl }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
                    ) : (
                      <GarmentSvg kind={categoryToGarment(it.category)} size={44} />
                    )}
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
                          {it.fitStatus === 'fits_well' ? '合身' : it.fitStatus ?? '合身'}
                        </Tag>
                      )}
                      {it.location ? (
                        <Tag style={{ paddingHorizontal: 6, paddingVertical: 2 }}>{it.location}</Tag>
                      ) : null}
                    </View>
                  </View>
                  <Pressable
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      backgroundColor: isLaundry ? T.ink : T.bgAlt,
                      borderRadius: 8,
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '600', color: isLaundry ? '#fff' : T.ink2 }}>替换</Text>
                  </Pressable>
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={{ marginTop: 14, padding: 14, backgroundColor: T.cardSoft, borderRadius: 14, gap: 8 }}>
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

        <Pressable
          onPress={() => navigation.navigate('OotdPoster', { outfitId, outfitTitle: heroTitle })}
          style={{
            marginTop: 14,
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
      </ScrollView>

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
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Pressable
            style={{
              width: 54,
              height: 54,
              borderRadius: 14,
              backgroundColor: T.card,
              ...T.shadowSm,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <SystemIcon name="heart" size={21} color={T.ink2} />
          </Pressable>
          <Pressable
            onPress={handleWear}
            style={({ pressed }) => ({
              flex: 1,
              height: 54,
              borderRadius: 14,
              backgroundColor: T.ink,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.88 : 1,
            })}
          >
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#fff' }}>今天穿这套</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
