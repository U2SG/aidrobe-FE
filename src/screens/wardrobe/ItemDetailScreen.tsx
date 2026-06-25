import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';

import {
  deleteWardrobeItem,
  getItemWearHistory,
  getWardrobeItem,
  updateWardrobeItem,
  updateWardrobeItemFit,
} from '@/api/wardrobe';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingBlock } from '@/components/feedback/LoadingBlock';
import {
  EditableChip,
  isLowConfidence,
  OptionPickerSheet,
  type PickerOption,
} from '@/components/ui';
import { CutoutBadge } from '@/components/ui/CutoutBadge';
import { GarmentSvg } from '@/components/ui/GarmentSvg';
import { StatusPill } from '@/components/ui/StatusPill';
import { SystemIcon } from '@/components/ui/SystemIcon';
import { SHOWCASE_WARDROBE } from '@/data/wardrobeShowcase';
import { useT } from '@/hooks/useT';
import {
  OCCASION_VALUES,
  resolveItemDisplayName,
  SEASON_VALUES,
} from '@/i18n/domainLabels';
import { colors, shadow } from '@/theme/design';
import type {
  FitIntent,
  ItemCategory,
  UpdateWardrobeItemBody,
  WardrobeItem,
} from '@/types/api';
import type { WardrobeStackParamList } from '@/types/navigation';

const FIT_INTENT_KEYS: FitIntent[] = [
  'regular',
  'fitted',
  'relaxed',
  'oversized',
  'cropped',
  'longline',
  'wide_leg',
  'straight',
  'slim',
];

// Which quick-edit field has its picker open. null = no sheet.
type QuickField = 'category' | 'color' | 'season' | 'occasion' | 'fit' | null;

// Format a 0–1 recognizer score as a percent label for the ConfidenceBadge.
function confidencePct(score: number | null | undefined): string {
  return score == null ? '' : `${Math.round(score * 100)}%`;
}

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
  // Fit lives on a separate endpoint (updateWardrobeItemFit), so it's tracked
  // apart from the metadata draft and saved alongside on the same CTA.
  const [fitIntent, setFitIntent] = useState<FitIntent | null>(null);
  const [activeField, setActiveField] = useState<QuickField>(null);
  // Fields the user has explicitly confirmed/edited this session — clears the
  // low-confidence review affordance once acted on.
  const [reviewed, setReviewed] = useState<Record<string, boolean>>({});
  // Shows a one-line note when a smart suggestion auto-fills related metadata.
  const [suggestionApplied, setSuggestionApplied] = useState(false);

  useEffect(() => {
    if (showcaseItem) {
      setDraft({ name: showcaseItem.name, category: showcaseItem.category, color: showcaseItem.color, status: 'wearable', location: '主衣柜' });
      setFitIntent(null);
    } else if (query.data) {
      const d = query.data;
      setDraft({
        name: d.name,
        category: d.category,
        color: d.color,
        status: d.status,
        location: d.location,
        seasonTags: d.seasonTags ?? [],
        styleTags: d.styleTags ?? [],
      });
      setFitIntent(d.fitIntent ?? null);
    }
  }, [query.data, showcaseItem]);

  const update = useMutation({
    // Save metadata then (if changed) fit — fit is a separate endpoint. Both
    // resolve to the same WardrobeItem shape so the cache lands on the latest.
    mutationFn: async (body: UpdateWardrobeItemBody) => {
      const next = await updateWardrobeItem(itemId, body);
      const fitChanged = fitIntent != null && fitIntent !== (query.data?.fitIntent ?? null);
      return fitChanged ? updateWardrobeItemFit(itemId, { fitIntent }) : next;
    },
    onSuccess: (next: WardrobeItem) => {
      qc.setQueryData(['wardrobeItem', itemId], next);
      qc.invalidateQueries({ queryKey: ['wardrobeItems'] });
    },
    // Two-step save (metadata then fit): if fit fails after metadata persisted,
    // the server is half-updated. Refetch both queries so the screen reflects the
    // real persisted state instead of the stale draft. The item refetch re-runs
    // the draft/fitIntent resync effect, so the chips repaint to server truth.
    onError: () => {
      qc.invalidateQueries({ queryKey: ['wardrobeItem', itemId] });
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

  // FE#39 quick-edit picker option sets (localized labels, stable wire values).
  const categoryOptions: PickerOption[] = CATEGORY_OPTIONS.map((c) => ({
    value: c.key,
    label: c.label,
  }));
  const seasonOptions: PickerOption[] = SEASON_VALUES.map((s) => ({
    value: s,
    label: tEnum('season', s),
  }));
  const occasionOptions: PickerOption[] = OCCASION_VALUES.map((o) => ({
    value: o,
    label: tEnum('occasion', o),
  }));
  const fitOptions: PickerOption[] = FIT_INTENT_KEYS.map((f) => ({
    value: f,
    label: tEnum('fitIntent', f),
  }));

  const seasonValue = (draft.seasonTags ?? [])
    .map((s) => tEnum('season', s))
    .join(' · ');
  const occasionValue = (draft.styleTags ?? [])
    .map((s) => tEnum('occasion', s))
    .join(' · ');

  // Smart suggestion: a blazer-ish item implies office/formal occasions. Only
  // adds (never removes) and only when occasion is still empty, so it's a hint
  // rather than an override. Mirrors the issue's category→occasion example.
  const applyCategorySuggestion = (category: ItemCategory) => {
    // Keep the state updater pure (no side effects) — StrictMode double-invokes
    // it in dev. Decide + flag here, then update draft.
    if (category !== 'outerwear' || (draft.styleTags ?? []).length > 0) return;
    setSuggestionApplied(true);
    setDraft((c) => ({ ...c, styleTags: ['office', 'formal'] }));
  };

  // Confidence review: persisted items rarely carry scores yet (FE#39 seam), so
  // these light up only when the server returns them and the user hasn't acted.
  const catLow =
    !reviewed.category && isLowConfidence(backendItem?.categoryConfidence);
  const colorLow = !reviewed.color && isLowConfidence(backendItem?.colorConfidence);
  // Session-only dismissal: marks the field as reviewed for this screen visit so
  // the low-confidence prompt stops showing. It does NOT persist acceptance — if
  // the server later returns scores, re-entering the screen re-shows the prompt.
  // The copy reads as "looks right / dismiss", not durable confirmation.
  // TODO(BE): durable confirmation needs a backend write (FE#39 seam).
  const markReviewed = (field: string) =>
    setReviewed((r) => ({ ...r, [field]: true }));

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

        {/* Quick edit — tap any chip to fix a field without a full form (FE#39) */}
        <View style={{ marginTop: 18 }}>
          <Text style={{ fontSize: 11, color: T.ink3, marginBottom: 4, paddingHorizontal: 4 }}>
            {t('item.quickEdit')}
          </Text>
          <Text style={{ fontSize: 11, color: T.ink4, marginBottom: 10, paddingHorizontal: 4 }}>
            {t('item.quickEdit.hint')}
          </Text>
          <View style={{ gap: 8 }}>
            <EditableChip
              label={t('item.category')}
              value={draft.category ? tEnum('category', draft.category) : null}
              placeholder={t('item.notSet')}
              onPress={() => setActiveField('category')}
              lowConfidence={catLow}
              confidenceScore={reviewed.category ? null : backendItem?.categoryConfidence}
              confidenceLabel={confidencePct(backendItem?.categoryConfidence)}
              onConfirm={catLow ? () => markReviewed('category') : undefined}
              confirmLabel={t('item.review.confirm')}
              changeLabel={t('item.review.change')}
            />
            <EditableChip
              label={t('item.color')}
              value={draft.color ?? null}
              placeholder={t('item.notSet')}
              onPress={() => setActiveField('color')}
              lowConfidence={colorLow}
              confidenceScore={reviewed.color ? null : backendItem?.colorConfidence}
              confidenceLabel={confidencePct(backendItem?.colorConfidence)}
              onConfirm={colorLow ? () => markReviewed('color') : undefined}
              confirmLabel={t('item.review.confirm')}
              changeLabel={t('item.review.change')}
            />
            <EditableChip
              label={t('item.season')}
              value={seasonValue || null}
              placeholder={t('item.notSet')}
              onPress={() => setActiveField('season')}
            />
            <EditableChip
              label={t('item.occasion')}
              value={occasionValue || null}
              placeholder={t('item.notSet')}
              onPress={() => setActiveField('occasion')}
            />
            <EditableChip
              label={t('item.fit')}
              value={fitIntent ? tEnum('fitIntent', fitIntent) : null}
              placeholder={t('item.notSet')}
              onPress={() => setActiveField('fit')}
            />
          </View>
          {suggestionApplied ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, paddingHorizontal: 4 }}>
              <SystemIcon name="sparkle" size={12} color={T.accent} strokeWidth={1.9} />
              <Text style={{ fontSize: 11, color: T.ink3 }}>{t('item.suggest.applied')}</Text>
            </View>
          ) : null}
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
            <Text style={{ fontSize: 15, fontWeight: '600', color: colors.inverse }}>{t('item.backToWardrobe')}</Text>
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
              <Text style={{ fontSize: 15, fontWeight: '600', color: colors.inverse }}>{t('common.saveChanges')}</Text>
            </Pressable>
          </>
        )}
      </View>

      {/* Quick-edit pickers (FE#39) — one shared sheet shell per field. */}
      <OptionPickerSheet
        mode="single"
        visible={activeField === 'category'}
        onClose={() => setActiveField(null)}
        title={t('item.editCategory')}
        options={categoryOptions}
        selected={draft.category ?? null}
        onSelect={(value) => {
          const category = value as ItemCategory;
          setDraft((c) => ({ ...c, category }));
          markReviewed('category');
          applyCategorySuggestion(category);
        }}
      />
      <OptionPickerSheet
        mode="single"
        visible={activeField === 'color'}
        onClose={() => setActiveField(null)}
        title={t('item.editColor')}
        options={[]}
        allowCustom
        customPlaceholder={t('item.color.placeholder')}
        selected={draft.color ?? null}
        onSelect={(value) => {
          setDraft((c) => ({ ...c, color: value }));
          markReviewed('color');
        }}
      />
      <OptionPickerSheet
        mode="multi"
        visible={activeField === 'season'}
        onClose={() => setActiveField(null)}
        title={t('item.editSeason')}
        options={seasonOptions}
        doneLabel={t('common.done')}
        selected={draft.seasonTags ?? []}
        onSelect={(values) => setDraft((c) => ({ ...c, seasonTags: values }))}
      />
      <OptionPickerSheet
        mode="multi"
        visible={activeField === 'occasion'}
        onClose={() => setActiveField(null)}
        title={t('item.editOccasion')}
        options={occasionOptions}
        doneLabel={t('common.done')}
        selected={draft.styleTags ?? []}
        onSelect={(values) => setDraft((c) => ({ ...c, styleTags: values }))}
      />
      <OptionPickerSheet
        mode="single"
        visible={activeField === 'fit'}
        onClose={() => setActiveField(null)}
        title={t('item.editFit')}
        options={fitOptions}
        selected={fitIntent}
        onSelect={(value) => setFitIntent(value as FitIntent)}
      />
    </View>
  );
}
