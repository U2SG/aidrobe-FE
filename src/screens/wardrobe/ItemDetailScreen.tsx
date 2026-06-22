import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';

import {
  deleteWardrobeItem,
  getItemWearHistory,
  getWardrobeItem,
  updateWardrobeItem,
} from '@/api/wardrobe';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingBlock } from '@/components/feedback/LoadingBlock';
import { CutoutBadge } from '@/components/ui/CutoutBadge';
import { GarmentSvg } from '@/components/ui/GarmentSvg';
import { StatusPill } from '@/components/ui/StatusPill';
import { SystemIcon } from '@/components/ui/SystemIcon';
import { SHOWCASE_WARDROBE } from '@/data/wardrobeShowcase';
import { useT } from '@/hooks/useT';
import { resolveItemDisplayName } from '@/i18n/domainLabels';
import { colors, shadow } from '@/theme/design';
import type { ItemCategory, UpdateWardrobeItemBody, WardrobeItem } from '@/types/api';
import type { WardrobeStackParamList } from '@/types/navigation';

type Props = NativeStackScreenProps<WardrobeStackParamList, 'ItemDetail'>;

const CATEGORY_KEYS: ItemCategory[] = ['top', 'bottom', 'dress', 'shoes', 'outerwear', 'accessory'];

const T = {
  bg: colors.groupedBackground,
  card: colors.elevated,
  cardSoft: colors.secondaryElevated,
  cardInner: colors.background,
  ink: colors.label,
  ink2: colors.secondaryLabel,
  ink3: colors.tertiaryLabel,
  ink4: colors.quaternaryLabel,
  divider: colors.separator,
  accent: colors.accent,
  shadowSm: shadow.soft,
};

const LOG_COLORS = [colors.separatorSoft, '#D7D3CC', colors.accent, colors.label];

// V3+ A — convert daily_counts dict to a 60-cell intensity array (oldest → newest).
// Server caps at 365 days; we use 60 for the heatmap. Levels: 0 / 1 / 2-3 / 4+.
function buildIntensitySeries(
  dailyCounts: Record<string, number> | undefined,
  days: number,
): number[] {
  const out: number[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    const count = dailyCounts?.[iso] ?? 0;
    out.push(count === 0 ? 0 : count === 1 ? 1 : count <= 3 ? 2 : 3);
  }
  return out;
}

export function ItemDetailScreen({ navigation, route }: Props) {
  const { t, tEnum, locale } = useT();
  const { itemId } = route.params;
  const CATEGORY_OPTIONS = CATEGORY_KEYS.map((key) => ({ key, label: tEnum('category', key) }));
  const showcaseItem = useMemo(
    () => SHOWCASE_WARDROBE.find((item) => item.id === itemId),
    [itemId],
  );
  const qc = useQueryClient();
  // Poll while the cutout is in flight; give up after ~90s (reconcile handles stragglers).
  const pollStartRef = useRef<number | null>(null);
  const query = useQuery({
    queryKey: ['wardrobeItem', itemId],
    queryFn: () => getWardrobeItem(itemId),
    enabled: !showcaseItem,
    refetchInterval: (q) => {
      if (q.state.data?.cutoutStatus !== 'queued') {
        pollStartRef.current = null;
        return false;
      }
      if (pollStartRef.current == null) pollStartRef.current = Date.now();
      if (Date.now() - pollStartRef.current > 90_000) return false;
      return 4000;
    },
  });

  const wearHistoryQuery = useQuery({
    queryKey: ['itemWearHistory', itemId],
    queryFn: () => getItemWearHistory(itemId, 60),
    enabled: !showcaseItem,
    staleTime: 5 * 60 * 1000,
  });
  const intensity = useMemo(
    () => buildIntensitySeries(wearHistoryQuery.data?.dailyCounts, 60),
    [wearHistoryQuery.data?.dailyCounts],
  );
  const [draft, setDraft] = useState<UpdateWardrobeItemBody>({});

  useEffect(() => {
    if (showcaseItem) {
      setDraft({ name: showcaseItem.name, category: showcaseItem.category, color: showcaseItem.color, status: 'wearable', location: '主衣柜' });
    } else if (query.data) {
      const d = query.data;
      setDraft({ name: d.name, category: d.category, color: d.color, status: d.status, location: d.location });
    }
  }, [query.data, showcaseItem]);

  const update = useMutation({
    mutationFn: (body: UpdateWardrobeItemBody) => updateWardrobeItem(itemId, body),
    onSuccess: (next: WardrobeItem) => {
      qc.setQueryData(['wardrobeItem', itemId], next);
      qc.invalidateQueries({ queryKey: ['wardrobeItems'] });
    },
  });

  const remove = useMutation({
    mutationFn: () => deleteWardrobeItem(itemId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wardrobeItems'] });
      navigation.goBack();
    },
  });

  if (!showcaseItem && query.isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: T.bg, alignItems: 'center', justifyContent: 'center' }}>
        <LoadingBlock />
      </View>
    );
  }
  if (!showcaseItem && (query.isError || !query.data)) {
    return (
      <View style={{ flex: 1, backgroundColor: T.bg, padding: 24 }}>
        <ErrorState onRetry={() => query.refetch()} />
      </View>
    );
  }

  const backendItem = query.data;
  const imageUri = showcaseItem ? null : (backendItem?.imageUrl ?? null);

  const displayName = backendItem
    ? resolveItemDisplayName(locale, {
        name: draft.name ?? backendItem.name,
        nameSource: backendItem.nameSource,
        displayName: backendItem.displayName,
        localizedNames: backendItem.localizedNames,
      })
    : (draft.name ?? '');

  const confirmDelete = () =>
    Alert.alert(t('item.delete.title'), t('item.delete.body'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => remove.mutate() },
    ]);

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      {/* Nav */}
      <View style={{ paddingTop: 52, paddingHorizontal: 16, paddingBottom: 6, flexDirection: 'row', justifyContent: 'space-between' }}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: T.card, alignItems: 'center', justifyContent: 'center', ...T.shadowSm }}
        >
          <SystemIcon name="chevronLeft" size={18} color={T.ink} />
        </Pressable>
        <Pressable
          onPress={confirmDelete}
          style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: T.card, alignItems: 'center', justifyContent: 'center', ...T.shadowSm }}
        >
          <SystemIcon name="trash" size={18} color={T.ink2} />
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={{ height: 280, backgroundColor: T.card, borderRadius: 20, alignItems: 'center', justifyContent: 'center', ...T.shadowSm, marginBottom: 18 }}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={{ width: '100%', height: '100%', borderRadius: 20 }} resizeMode="contain" />
          ) : showcaseItem?.image ? (
            <Image source={showcaseItem.image} style={{ width: '100%', height: '100%', borderRadius: 20 }} resizeMode="contain" />
          ) : (
            <GarmentSvg kind="shirt" size={180} />
          )}
          {backendItem?.cutoutStatus === 'queued' && (
            <CutoutBadge style={{ position: 'absolute', top: 12, left: 12 }} />
          )}
        </View>

        {/* Title + status */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 24, fontWeight: '600', color: T.ink }}>{displayName || '—'}</Text>
            <Text style={{ marginTop: 6, fontSize: 12, color: T.ink3 }}>
              {[
                backendItem?.purchaseDate
                  ? t('item.purchasedOn', { date: backendItem.purchaseDate })
                  : null,
                backendItem?.material,
                draft.color,
                draft.location ?? t('today.defaultLocation'),
                backendItem?.wearCount != null
                  ? t('item.wornCount', { count: backendItem.wearCount })
                  : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          </View>
          <StatusPill
            kind={draft.status === 'wearable' ? 'ok' : 'danger'}
            label={tEnum('status', draft.status)}
          />
        </View>

        {/* Specs grid */}
        <View style={{ marginTop: 18, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {[
            { label: t('item.category'), value: draft.category ? tEnum('category', draft.category) : '—' },
            { label: t('item.color'), value: draft.color ?? '—' },
            { label: t('item.location'), value: draft.location ?? '—' },
          ].map((s) => (
            <View key={s.label} style={{ backgroundColor: T.card, borderRadius: 10, ...T.shadowSm, minWidth: 100, padding: 12 }}>
              <Text style={{ fontSize: 10, color: T.ink3, marginBottom: 3 }}>{s.label}</Text>
              <Text style={{ fontSize: 13, color: T.ink, fontWeight: '500' }}>{s.value}</Text>
            </View>
          ))}
        </View>

        {/* Name edit */}
        <View style={{ marginTop: 14, backgroundColor: T.card, borderRadius: 14, padding: 14, ...T.shadowSm }}>
          <Text style={{ fontSize: 11, color: T.ink3, marginBottom: 6 }}>{t('item.name')}</Text>
          <TextInput
            value={draft.name ?? ''}
            onChangeText={(name) => setDraft((c) => ({ ...c, name }))}
            style={{ fontSize: 15, color: T.ink }}
          />
        </View>

        {/* Category */}
        <View style={{ marginTop: 12 }}>
          <Text style={{ fontSize: 11, color: T.ink3, marginBottom: 8, paddingHorizontal: 4 }}>{t('item.category')}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {CATEGORY_OPTIONS.map((cat) => (
              <Pressable
                key={cat.key}
                onPress={() => setDraft((c) => ({ ...c, category: cat.key }))}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 7,
                  borderRadius: 999,
                  backgroundColor: draft.category === cat.key ? T.ink : 'transparent',
                  borderWidth: 1,
                  borderColor: draft.category === cat.key ? T.ink : T.divider,
                }}
              >
                <Text style={{ fontSize: 12, color: draft.category === cat.key ? '#fff' : T.ink2 }}>
                  {cat.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Location edit */}
        <View style={{ marginTop: 12, backgroundColor: T.card, borderRadius: 14, padding: 14, ...T.shadowSm }}>
          <Text style={{ fontSize: 11, color: T.ink3, marginBottom: 6 }}>{t('item.location')}</Text>
          <TextInput
            value={draft.location ?? ''}
            onChangeText={(location) => setDraft((c) => ({ ...c, location }))}
            placeholder={t('item.location.placeholder')}
            placeholderTextColor={T.ink4}
            style={{ fontSize: 15, color: T.ink }}
          />
        </View>

        {/* Wearable toggle */}
        <View style={{ marginTop: 14, backgroundColor: T.card, borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', ...T.shadowSm }}>
          <View style={{ flex: 1, paddingRight: 16 }}>
            <Text style={{ fontSize: 14, fontWeight: '500', color: T.ink }}>{t('item.wearable')}</Text>
            <Text style={{ marginTop: 4, fontSize: 11, lineHeight: 17, color: T.ink3 }}>
              {t('item.wearable.hint')}
            </Text>
          </View>
          <Switch
            value={draft.status === 'wearable'}
            trackColor={{ true: T.accent, false: T.divider }}
            thumbColor="#fff"
            onValueChange={(value) =>
              setDraft((c) => ({ ...c, status: value ? 'wearable' : 'unavailable' }))
            }
          />
        </View>

        {/* Wear log */}
        <View style={{ marginTop: 14, backgroundColor: T.card, borderRadius: 14, padding: 14, ...T.shadowSm }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: T.ink }}>{t('item.wearLog')}</Text>
            <Text style={{ fontSize: 11, color: T.ink3 }}>{t('item.wearLog.period')}</Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 3 }}>
            {intensity.map((v, i) => (
              <View
                key={i}
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 2,
                  backgroundColor: LOG_COLORS[v] ?? LOG_COLORS[0],
                }}
              />
            ))}
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
            <Text style={{ fontSize: 10, color: T.ink3 }}>
              {t('item.wornTotal', { count: backendItem?.wearCount ?? 0 })}
              {backendItem?.purchasePrice && (backendItem?.wearCount ?? 0) > 0
                ? ` · ${t('item.costPerWear', { amount: Math.round(backendItem.purchasePrice / Math.max(1, backendItem.wearCount ?? 1)) })}`
                : ''}
            </Text>
            <Text style={{ fontSize: 10, color: T.ink3 }}>
              {backendItem?.lastWorn
                ? t('item.lastWorn', { date: backendItem.lastWorn })
                : t('item.wearLog.period')}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Sticky CTA */}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 36, backgroundColor: T.bg, gap: 10 }}>
        {showcaseItem ? (
          <Pressable
            onPress={() => navigation.goBack()}
            style={({ pressed }) => ({ height: 50, borderRadius: 14, backgroundColor: T.ink, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.75 : 1 })}
          >
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#fff' }}>{t('item.backToWardrobe')}</Text>
          </Pressable>
        ) : (
          <>
            <Pressable
              onPress={() =>
                navigation.getParent()?.navigate('DiscoverTab', {
                  screen: 'AskAidrobe',
                  params: { focusedItemId: itemId },
                } as never)
              }
              style={({ pressed }) => ({ height: 50, borderRadius: 14, backgroundColor: T.card, borderWidth: 1, borderColor: T.divider, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: pressed ? 0.75 : 1 })}
            >
              <SystemIcon name="sparkle" size={15} color={T.accent} strokeWidth={1.9} />
              <Text style={{ fontSize: 15, fontWeight: '600', color: T.ink }}>{t('item.askOutfit')}</Text>
            </Pressable>
            <Pressable
              onPress={() => update.mutate(draft)}
              disabled={update.isPending}
              style={({ pressed }) => ({ height: 50, borderRadius: 14, backgroundColor: T.ink, alignItems: 'center', justifyContent: 'center', opacity: update.isPending || pressed ? 0.75 : 1 })}
            >
              <Text style={{ fontSize: 15, fontWeight: '600', color: '#fff' }}>{t('common.saveChanges')}</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}
