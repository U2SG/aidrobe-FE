import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQueries, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';

import {
  getFeedbackTags,
  getOutfitDetail,
  sendOutfitFeedbackBundle,
} from '@/api/recommendations';
import { getWardrobeItem } from '@/api/wardrobe';
import { GarmentSvg } from '@/components/ui/GarmentSvg';
import { SystemIcon } from '@/components/ui/SystemIcon';
import { useTrack } from '@/hooks/useTrack';
import { useToastStore } from '@/store/toast';
import { colors, shadow } from '@/theme/design';
import type {
  FeedbackKind,
  FitFeedbackType,
  ItemCategory,
  WardrobeItem,
} from '@/types/api';
import type { TodayStackParamList } from '@/types/navigation';

type Props = NativeStackScreenProps<TodayStackParamList, 'FeedbackSheet'>;

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
  shadowSm: shadow.soft,
};

type FitChoice = 'tight' | 'fit' | 'loose';

// V3+ A: 4-tier overall (love/like/neutral/dislike) on the wire.
// Frontend exposes 4 buttons that map directly to server enum.
const OVERALL_OPTIONS: { id: FeedbackKind; mark: string; label: string }[] = [
  { id: 'love', mark: '爱', label: '很喜欢' },
  { id: 'like', mark: '好', label: '不错' },
  { id: 'neutral', mark: '平', label: '一般' },
  { id: 'dislike', mark: '差', label: '不喜欢' },
];

// Fallback tag list when /feedback-tags is empty (e.g. flag off, fresh deploy).
const FALLBACK_TAGS = ['被夸利落', '太正式了', '下次少穿', '适合开会', '想多穿这种', '配色赞'];

function categoryToGarment(cat?: ItemCategory | null): 'shirt' | 'blazer' | 'jeans' | 'loafer' | 'dress' | 'bag' {
  switch (cat) {
    case 'top':
      return 'shirt';
    case 'outerwear':
      return 'blazer';
    case 'bottom':
      return 'jeans';
    case 'shoes':
      return 'loafer';
    case 'dress':
      return 'dress';
    case 'accessory':
      return 'bag';
    default:
      return 'shirt';
  }
}

function fitChoiceToServer(c: FitChoice): FitFeedbackType {
  if (c === 'fit') return 'fits_well';
  return c;
}

export function FeedbackSheetScreen({ navigation, route }: Props) {
  const { outfitId } = route.params;
  const isLocal = outfitId === 'local-showcase';
  const [overall, setOverall] = useState<FeedbackKind | null>(null);
  const [fitMap, setFitMap] = useState<Record<string, FitChoice>>({});
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const showToast = useToastStore((state) => state.show);
  const track = useTrack();

  const outfitQuery = useQuery({
    queryKey: ['outfitDetail', outfitId],
    queryFn: () => getOutfitDetail(outfitId),
    enabled: !isLocal,
  });

  const tagsQuery = useQuery({
    queryKey: ['feedbackTags', 'commute'],
    queryFn: () => getFeedbackTags('commute'),
    staleTime: 60 * 60 * 1000,
    enabled: !isLocal,
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
  const items = fullItems.length ? fullItems : itemBriefs.map((b) => ({
    id: b.id,
    name: b.name ?? '—',
    category: b.category ?? null,
    color: b.color ?? '',
    imageUrl: null,
  }));

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const setFit = (id: string, fit: FitChoice) => {
    setFitMap((prev) => ({ ...prev, [id]: fit }));
  };

  // Tag dictionary — server-provided keys when available, else fallback labels.
  // We send tag keys (server canonical) when known; legacy labels when not.
  const overallTags = tagsQuery.data?.tags.filter((t) => t.appliesTo.includes('overall')) ?? [];
  const tagItems = overallTags.length
    ? overallTags.map((t) => ({ key: t.key, label: t.labelZhCn }))
    : FALLBACK_TAGS.map((label) => ({ key: label, label }));

  const submit = async () => {
    if (!overall) {
      showToast({ message: '请先选择整体感觉', kind: 'error' });
      return;
    }
    setSaving(true);
    try {
      if (!isLocal) {
        // V3+ A — single transactional bundle. On 422 the server rolls back
        // and the axios interceptor surfaces the error toast for us.
        await sendOutfitFeedbackBundle(outfitId, {
          overall: { kind: overall, reasonTags: selectedTags },
          items: Object.entries(fitMap).map(([itemId, choice]) => ({
            itemId,
            feedbackType: fitChoiceToServer(choice),
            scene: 'commute',
          })),
        });
      }
      track('outfit_feedback_sent', { outfitId, overall, selectedTags, fitMap });
      showToast({ message: '感谢反馈，明天推荐会更准', kind: 'success' });
      navigation.goBack();
    } catch {
      // Interceptor already toasted; keep user on the screen so they can retry.
    } finally {
      setSaving(false);
    }
  };

  const variantLabel = String(outfitQuery.data?.variant ?? 'safe').toUpperCase();

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <View
        style={{
          paddingTop: 52,
          paddingHorizontal: 16,
          paddingBottom: 6,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Pressable onPress={() => navigation.goBack()}>
          <SystemIcon name="x" size={22} color={T.ink2} />
        </Pressable>
        <Text style={{ fontSize: 13, color: T.ink3, fontFamily: 'monospace' }}>21:48 · 回家了</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={{ fontSize: 11, color: T.accent, letterSpacing: 1, fontFamily: 'monospace', marginBottom: 4 }}>
          END OF DAY
        </Text>
        <Text style={{ fontSize: 28, fontWeight: '600', color: T.ink, lineHeight: 34 }}>
          今天那套穿得{'\n'}怎么样？
        </Text>
        <Text style={{ fontSize: 12, color: T.ink3, marginTop: 8, marginBottom: 22, lineHeight: 19 }}>
          一句话反馈 · Aidrobe 会立刻调整明天的推荐。
        </Text>

        <View
          style={{
            height: 130,
            backgroundColor: T.card,
            borderRadius: 14,
            ...T.shadowSm,
            position: 'relative',
            marginBottom: 22,
            overflow: 'hidden',
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            gap: 10,
          }}
        >
          {items.slice(0, 4).map((it, i) => (
            <View
              key={it.id}
              style={{
                width: 70,
                height: 90,
                borderRadius: 8,
                backgroundColor: T.cardInner,
                alignItems: 'center',
                justifyContent: 'center',
                marginLeft: i === 0 ? 0 : -16,
                overflow: 'hidden',
              }}
            >
              {(it as WardrobeItem).imageUrl ? (
                <Image
                  source={{ uri: (it as WardrobeItem).imageUrl ?? undefined }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="contain"
                />
              ) : (
                <GarmentSvg kind={categoryToGarment(it.category)} size={64} />
              )}
            </View>
          ))}
          <View
            style={{
              position: 'absolute',
              top: 10,
              right: 10,
              backgroundColor: T.accentBg,
              paddingHorizontal: 7,
              paddingVertical: 3,
              borderRadius: 4,
            }}
          >
            <Text style={{ fontSize: 9, color: T.accent, fontFamily: 'monospace', letterSpacing: 0.6 }}>
              {variantLabel}
            </Text>
          </View>
        </View>

        <Text style={{ fontSize: 12, color: T.ink3, marginBottom: 10 }}>整体感觉</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 22 }}>
          {OVERALL_OPTIONS.map((o) => (
            <Pressable
              key={o.id}
              onPress={() => setOverall(o.id)}
              style={{
                flex: 1,
                paddingVertical: 14,
                paddingHorizontal: 8,
                borderRadius: 12,
                backgroundColor: overall === o.id ? T.ink : T.card,
                alignItems: 'center',
                gap: 6,
                ...T.shadowSm,
              }}
            >
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: overall === o.id ? 'rgba(255,255,255,0.14)' : T.bgAlt,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '700',
                    color: overall === o.id ? colors.inverse : T.ink2,
                  }}
                >
                  {o.mark}
                </Text>
              </View>
              <Text style={{ fontSize: 11, color: overall === o.id ? colors.inverse : T.ink2 }}>{o.label}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={{ fontSize: 12, color: T.ink3, marginBottom: 10 }}>有哪件不舒服吗？</Text>
        <View style={{ gap: 10, marginBottom: 22 }}>
          {items.map((it) => (
            <View
              key={it.id}
              style={{
                backgroundColor: T.card,
                borderRadius: 12,
                padding: 12,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                ...T.shadowSm,
              }}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  backgroundColor: T.cardInner,
                  borderRadius: 8,
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}
              >
                {(it as WardrobeItem).imageUrl ? (
                  <Image
                    source={{ uri: (it as WardrobeItem).imageUrl ?? undefined }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="contain"
                  />
                ) : (
                  <GarmentSvg kind={categoryToGarment(it.category)} size={36} />
                )}
              </View>
              <Text style={{ flex: 1, fontSize: 12, fontWeight: '500', color: T.ink }} numberOfLines={1}>
                {it.name}
              </Text>
              <View style={{ flexDirection: 'row', gap: 4 }}>
                {(['tight', 'fit', 'loose'] as FitChoice[]).map((opt) => (
                  <Pressable
                    key={opt}
                    onPress={() => setFit(it.id, opt)}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: 8,
                      backgroundColor: fitMap[it.id] === opt ? T.ink : 'transparent',
                      borderWidth: 1,
                      borderColor: fitMap[it.id] === opt ? T.ink : T.divider,
                    }}
                  >
                    <Text style={{ fontSize: 11, color: fitMap[it.id] === opt ? colors.inverse : T.ink2 }}>
                      {opt === 'tight' ? '紧' : opt === 'fit' ? '合身' : '松'}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ))}
        </View>

        <Text style={{ fontSize: 12, color: T.ink3, marginBottom: 10 }}>其他想说的</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {tagItems.map((t) => (
            <Pressable
              key={t.key}
              onPress={() => toggleTag(t.key)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 7,
                borderRadius: 999,
                backgroundColor: selectedTags.includes(t.key) ? T.ink : 'transparent',
                borderWidth: 1,
                borderColor: selectedTags.includes(t.key) ? T.ink : T.divider,
              }}
            >
              <Text style={{ fontSize: 11, color: selectedTags.includes(t.key) ? colors.inverse : T.ink2 }}>
                {t.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          paddingHorizontal: 20,
          paddingTop: 14,
          paddingBottom: 36,
          backgroundColor: T.bg,
        }}
      >
        <Pressable
          onPress={submit}
          disabled={saving}
          style={({ pressed }) => ({
            height: 52,
            borderRadius: 14,
            backgroundColor: T.ink,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: saving || pressed ? 0.7 : 1,
          })}
        >
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.inverse }}>保存反馈 · 影响明天推荐</Text>
        </Pressable>
      </View>
    </View>
  );
}
