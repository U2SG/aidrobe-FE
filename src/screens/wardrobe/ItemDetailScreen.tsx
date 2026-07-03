import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode, RefObject } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, useWindowDimensions, View } from 'react-native';

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
  BottomSheet,
  Button,
  ImageThumb,
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
import { enableMvpV2Ui } from '@/lib/featureFlags';
import { invalidateAfterWardrobeItemChange } from '@/state/invalidation';
import { colors, radius, shadow, type } from '@/theme/design';
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

type QuickField = 'category' | 'color' | 'season' | 'occasion' | 'fit' | null;
type Props = NativeStackScreenProps<WardrobeStackParamList, 'ItemDetail'>;

const CATEGORY_KEYS: ItemCategory[] = ['top', 'bottom', 'dress', 'shoes', 'outerwear', 'accessory'];

const T = {
  bg: colors.groupedBackground,
  card: colors.elevated,
  cardSoft: colors.secondaryElevated,
  ink: colors.label,
  ink2: colors.secondaryLabel,
  ink3: colors.tertiaryLabel,
  ink4: colors.quaternaryLabel,
  divider: colors.separator,
  dividerSoft: colors.separatorSoft,
  accent: colors.accent,
};

const LOG_COLORS = [colors.separatorSoft, '#D7D3CC', colors.accent, colors.label];

function confidencePct(score: number | null | undefined): string {
  return score == null ? '' : `${Math.round(score * 100)}%`;
}

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

function draftFromItem(item: WardrobeItem): UpdateWardrobeItemBody {
  return {
    name: item.name,
    category: item.category,
    color: item.color,
    status: item.status,
    location: item.location,
    seasonTags: item.seasonTags ?? [],
    styleTags: item.styleTags ?? [],
  };
}

function sameStringArray(a: string[] | null | undefined, b: string[] | null | undefined): boolean {
  const left = a ?? [];
  const right = b ?? [];
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function sameNullable(a: string | null | undefined, b: string | null | undefined): boolean {
  return (a ?? null) === (b ?? null);
}

function hasDraftChanges(
  draft: UpdateWardrobeItemBody,
  item: WardrobeItem | undefined,
  fitIntent: FitIntent | null,
): boolean {
  if (!item) return false;
  return (
    !sameNullable(draft.name, item.name) ||
    !sameNullable(draft.category, item.category) ||
    !sameNullable(draft.color, item.color) ||
    !sameNullable(draft.status, item.status) ||
    !sameNullable(draft.location, item.location) ||
    !sameStringArray(draft.seasonTags, item.seasonTags) ||
    !sameStringArray(draft.styleTags, item.styleTags) ||
    (fitIntent ?? null) !== (item.fitIntent ?? null)
  );
}

interface DetailCardProps {
  title: string;
  children: ReactNode;
}

function DetailCard({ title, children }: DetailCardProps) {
  return (
    <View
      style={{
        backgroundColor: T.card,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: T.dividerSoft,
        padding: 16,
        gap: 4,
      }}
    >
      <Text style={{ ...type.footnote, fontWeight: '700', color: T.ink }}>{title}</Text>
      <View style={{ marginTop: 4 }}>{children}</View>
    </View>
  );
}

interface DetailRowProps {
  label: string;
  value?: string | null;
  placeholder: string;
  onPress: () => void;
  lowConfidence?: boolean;
  confidenceScore?: number | null;
  confidenceLabel?: string;
  onConfirm?: () => void;
  confirmLabel?: string;
  changeLabel?: string;
}

function DetailRow({
  label,
  value,
  placeholder,
  onPress,
  lowConfidence = false,
  confidenceScore,
  confidenceLabel,
  onConfirm,
  confirmLabel,
  changeLabel,
}: DetailRowProps) {
  const display = value?.trim() || placeholder;
  const isEmpty = !value?.trim();
  const showReview = lowConfidence && onConfirm != null;

  return (
    <View style={{ paddingVertical: 6, gap: 8 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${display}`}
        onPress={onPress}
        style={({ pressed }) => ({
          minHeight: 48,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          opacity: pressed ? 0.72 : 1,
        })}
      >
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ ...type.caption, color: T.ink3 }}>{label}</Text>
          <Text
            numberOfLines={2}
            style={{
              ...type.callout,
              fontWeight: '600',
              color: isEmpty ? T.accent : T.ink,
            }}
          >
            {display}
          </Text>
        </View>
        {confidenceScore != null ? (
          <View
            style={{
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: radius.pill,
              backgroundColor: colors.warningBg,
            }}
          >
            <Text style={{ ...type.caption, color: colors.warning }}>{confidenceLabel}</Text>
          </View>
        ) : null}
        <SystemIcon
          name={lowConfidence ? 'sparkle' : 'chevronRight'}
          size={15}
          color={lowConfidence ? colors.warning : T.ink3}
          strokeWidth={1.9}
        />
      </Pressable>
      {showReview ? (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button
            label={confirmLabel ?? ''}
            size="sm"
            onPress={onConfirm}
            icon={<SystemIcon name="check" size={13} color={colors.inverse} strokeWidth={2} />}
            style={{ flex: 1 }}
          />
          <Button
            label={changeLabel ?? ''}
            size="sm"
            variant="secondary"
            onPress={onPress}
            style={{ flex: 1 }}
          />
        </View>
      ) : null}
    </View>
  );
}

interface TextDetailRowProps {
  label: string;
  value: string;
  placeholder: string;
  inputRef?: RefObject<TextInput | null>;
  onChangeText: (value: string) => void;
}

function TextDetailRow({ label, value, placeholder, inputRef, onChangeText }: TextDetailRowProps) {
  return (
    <View style={{ paddingVertical: 6, gap: 2 }}>
      <Text style={{ ...type.caption, color: T.ink3 }}>{label}</Text>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={T.accent}
        style={{
          minHeight: 44,
          paddingVertical: 0,
          ...type.callout,
          fontWeight: '600',
          color: T.ink,
        }}
      />
    </View>
  );
}

interface MenuActionProps {
  label: string;
  icon: 'refresh' | 'wardrobe' | 'x' | 'trash' | 'check';
  onPress: () => void;
  disabled?: boolean;
  destructive?: boolean;
  cardWidth: number;
}

function MenuAction({ label, icon, onPress, disabled = false, destructive = false, cardWidth }: MenuActionProps) {
  const color = disabled ? T.ink4 : destructive ? colors.danger : T.ink;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        width: cardWidth,
        opacity: disabled ? 0.45 : pressed ? 0.68 : 1,
      })}
    >
      <View
        style={{
          backgroundColor: T.cardSoft,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: 16,
          paddingHorizontal: 8,
          gap: 8,
          minHeight: 80,
        }}
      >
        <SystemIcon name={icon} size={22} color={color} strokeWidth={1.9} />
        <Text style={{ fontSize: 11, fontWeight: '600', color, textAlign: 'center' }} numberOfLines={2}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

export function ItemDetailScreen({ navigation, route }: Props) {
  const { t, tEnum, locale } = useT();
  const { width } = useWindowDimensions();
  const { itemId } = route.params;
  const CATEGORY_OPTIONS = CATEGORY_KEYS.map((key) => ({ key, label: tEnum('category', key) }));
  const locationInputRef = useRef<TextInput>(null);
  const showcaseItem = useMemo(
    () => SHOWCASE_WARDROBE.find((item) => item.id === itemId),
    [itemId],
  );
  const qc = useQueryClient();
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
  const [fitIntent, setFitIntent] = useState<FitIntent | null>(null);
  const [activeField, setActiveField] = useState<QuickField>(null);
  const [reviewed, setReviewed] = useState<Record<string, boolean>>({});
  const [suggestionApplied, setSuggestionApplied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [nameSheetOpen, setNameSheetOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState('');

  const backendItem = query.data;

  const resetDraft = () => {
    if (showcaseItem) {
      setDraft({
        name: showcaseItem.name,
        category: showcaseItem.category,
        color: showcaseItem.color,
        status: 'wearable',
        location: t('today.defaultLocation'),
      });
      setFitIntent(null);
      return;
    }
    if (!backendItem) return;
    setDraft(draftFromItem(backendItem));
    setFitIntent(backendItem.fitIntent ?? null);
  };

  useEffect(() => {
    resetDraft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backendItem, showcaseItem]);

  const update = useMutation({
    mutationFn: async (body: UpdateWardrobeItemBody) => {
      const next = await updateWardrobeItem(itemId, body);
      const fitChanged = fitIntent != null && fitIntent !== (query.data?.fitIntent ?? null);
      return fitChanged ? updateWardrobeItemFit(itemId, { fitIntent }) : next;
    },
    onSuccess: (next: WardrobeItem) => {
      qc.setQueryData(['wardrobeItem', itemId], next);
      invalidateAfterWardrobeItemChange(qc);
    },
    onError: () => {
      qc.invalidateQueries({ queryKey: ['wardrobeItem', itemId] });
      qc.invalidateQueries({ queryKey: ['wardrobeItems'] });
    },
  });

  const remove = useMutation({
    mutationFn: () => deleteWardrobeItem(itemId),
    onSuccess: () => {
      invalidateAfterWardrobeItemChange(qc);
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

  // While the user is editing the name of an AI/old row, name_source is still
  // non-user, so treat an edited draft name as user-named — otherwise the
  // deterministic fallback would keep showing "White Top" over the just-typed
  // name until the backend flips name_source.
  const nameEdited = backendItem != null && !sameNullable(draft.name, backendItem.name);
  const displayName = backendItem
    ? resolveItemDisplayName(locale, {
        name: draft.name ?? backendItem.name,
        nameSource: nameEdited ? 'user' : backendItem.nameSource,
        displayName: backendItem.displayName,
        localizedNames: backendItem.localizedNames,
        // BE#64 will backfill displayName/localizedNames; these fields keep old rows localized.
        category: draft.category ?? backendItem.category,
        color: draft.color ?? backendItem.color,
        subCategory: backendItem.subCategory,
      })
    : resolveItemDisplayName(locale, {
        name: draft.name ?? showcaseItem?.name,
        category: draft.category ?? showcaseItem?.category,
        color: draft.color ?? showcaseItem?.color,
      });

  const imageUri = showcaseItem ? null : (backendItem?.imageUrl ?? null);
  const imageSource = showcaseItem?.image ?? null;
  const heroImageSize = Math.min(Math.max(width - 96, 196), 280);
  const isDirty = hasDraftChanges(draft, backendItem, fitIntent);
  const colorLabel = draft.color ? tEnum('color', draft.color) : '';
  const categoryLabel = draft.category ? tEnum('category', draft.category) : '';
  const locationLabel = draft.location?.trim() || t('today.defaultLocation');
  const summaryLine = [
    colorLabel,
    locationLabel,
    backendItem?.wearCount != null ? t('item.wornCount', { count: backendItem.wearCount }) : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const seasonValue = (draft.seasonTags ?? []).map((s) => tEnum('season', s)).join(' · ');
  const occasionValue = (draft.styleTags ?? []).map((s) => tEnum('occasion', s)).join(' · ');
  const fitValue = fitIntent ? tEnum('fitIntent', fitIntent) : '';
  const aiAdvice = t('item.aiAdvice.body', {
    color: colorLabel || t('item.aiAdvice.neutralColor'),
    category: categoryLabel || t('item.aiAdvice.neutralCategory'),
  });

  const confirmDelete = () =>
    Alert.alert(t('item.delete.title'), t('item.delete.body'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => remove.mutate() },
    ]);

  const openAskWithItem = () => {
    // V2 promotes Ask to its own tab; V1 reaches it through Discover. The parent
    // tab navigator differs by flag, so use a loose cast rather than two route
    // param lists.
    const parent = navigation.getParent() as
      | { navigate: (name: string, params?: object) => void }
      | undefined;
    parent?.navigate(enableMvpV2Ui ? 'AskTab' : 'DiscoverTab', {
      screen: 'AskAidrobe',
      params: { focusedItemId: itemId },
    });
  };

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

  const applyCategorySuggestion = (category: ItemCategory) => {
    if (category !== 'outerwear' || (draft.styleTags ?? []).length > 0) return;
    setSuggestionApplied(true);
    setDraft((c) => ({ ...c, styleTags: ['office', 'formal'] }));
  };

  const catLow = !reviewed.category && isLowConfidence(backendItem?.categoryConfidence);
  const colorLow = !reviewed.color && isLowConfidence(backendItem?.colorConfidence);
  const markReviewed = (field: string) => setReviewed((r) => ({ ...r, [field]: true }));

  const openNameEditor = () => {
    setNameDraft(draft.name ?? '');
    setNameSheetOpen(true);
  };

  const focusLocation = () => {
    setMenuOpen(false);
    requestAnimationFrame(() => locationInputRef.current?.focus());
  };

  // API_GAP[untracked]: per-item "mark worn today" endpoint is not available.
  // Fallback: keep the CTA visible but disabled; wear history remains read-only.
  const markWornDisabled = true;
  // API_GAP[untracked]: per-item re-identification endpoint is not available.
  // Fallback: keep the more-menu action visible but disabled; no local mock.
  const reidentifyDisabled = true;

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <View
        style={{
          paddingTop: 52,
          paddingHorizontal: 16,
          paddingBottom: 6,
          flexDirection: 'row',
          justifyContent: 'space-between',
        }}
      >
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.goBack()}
          style={({ pressed }) => ({
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: T.card,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: T.dividerSoft,
            opacity: pressed ? 0.72 : 1,
          })}
        >
          <SystemIcon name="chevronLeft" size={18} color={T.ink} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('item.moreActions')}
          onPress={() => setMenuOpen(true)}
          style={({ pressed }) => ({
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: T.card,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: T.dividerSoft,
            opacity: pressed ? 0.72 : 1,
          })}
        >
          <SystemIcon name="more" size={18} color={T.ink2} />
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: isDirty ? 132 : 32, gap: 14 }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            backgroundColor: T.card,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: T.dividerSoft,
            padding: 18,
            gap: 16,
          }}
        >
          <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <ImageThumb
              uri={imageUri}
              source={imageSource}
              size={heroImageSize}
              cornerRadius={radius.md}
              fallbackLabel={displayName || categoryLabel}
              icon={<GarmentSvg kind="shirt" size={Math.round(heroImageSize * 0.48)} />}
              accessibilityLabel={displayName}
            />
            {backendItem?.cutoutStatus === 'queued' ? (
              <CutoutBadge style={{ position: 'absolute', top: 10, left: 10 }} />
            ) : null}
          </View>

          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
              <Pressable accessibilityRole="button" onPress={openNameEditor} style={{ flex: 1, gap: 5 }}>
                <Text style={{ ...type.title2, color: T.ink }} numberOfLines={2}>
                  {displayName || t('ask.itemFallback')}
                </Text>
                <Text style={{ ...type.caption, color: T.ink3 }}>{t('item.editName')}</Text>
              </Pressable>
              <StatusPill
                kind={draft.status === 'wearable' ? 'ok' : 'danger'}
                label={tEnum('status', draft.status)}
              />
            </View>
            <Text style={{ ...type.footnote, color: T.ink3 }}>{summaryLine}</Text>
          </View>

          <View style={{ gap: 10 }}>
            <Button
              label={t('item.askOutfit')}
              onPress={openAskWithItem}
              icon={<SystemIcon name="sparkle" size={16} color={colors.inverse} strokeWidth={1.9} />}
              disabled={Boolean(showcaseItem)}
            />
            <Button
              label={t('item.markWornToday')}
              variant="secondary"
              onPress={() => undefined}
              disabled={markWornDisabled || Boolean(showcaseItem)}
            />
          </View>
        </View>

        <DetailCard title={t('item.section.basic')}>
          <DetailRow
            label={t('item.category')}
            value={draft.category ? tEnum('category', draft.category) : null}
            placeholder={t('item.addValue')}
            onPress={() => setActiveField('category')}
            lowConfidence={catLow}
            confidenceScore={reviewed.category ? null : backendItem?.categoryConfidence}
            confidenceLabel={confidencePct(backendItem?.categoryConfidence)}
            onConfirm={catLow ? () => markReviewed('category') : undefined}
            confirmLabel={t('item.review.confirm')}
            changeLabel={t('item.review.change')}
          />
          <DetailRow
            label={t('item.color')}
            value={colorLabel}
            placeholder={t('item.addValue')}
            onPress={() => setActiveField('color')}
            lowConfidence={colorLow}
            confidenceScore={reviewed.color ? null : backendItem?.colorConfidence}
            confidenceLabel={confidencePct(backendItem?.colorConfidence)}
            onConfirm={colorLow ? () => markReviewed('color') : undefined}
            confirmLabel={t('item.review.confirm')}
            changeLabel={t('item.review.change')}
          />
          <TextDetailRow
            label={t('item.location')}
            value={draft.location ?? ''}
            placeholder={t('item.addValue')}
            inputRef={locationInputRef}
            onChangeText={(location) => setDraft((c) => ({ ...c, location }))}
          />
        </DetailCard>

        <DetailCard title={t('item.section.style')}>
          <DetailRow
            label={t('item.season')}
            value={seasonValue}
            placeholder={t('item.addValue')}
            onPress={() => setActiveField('season')}
          />
          <DetailRow
            label={t('item.occasion')}
            value={occasionValue}
            placeholder={t('item.addValue')}
            onPress={() => setActiveField('occasion')}
          />
          <DetailRow
            label={t('item.fit')}
            value={fitValue}
            placeholder={t('item.addValue')}
            onPress={() => setActiveField('fit')}
          />
          {suggestionApplied ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <SystemIcon name="sparkle" size={12} color={T.accent} strokeWidth={1.9} />
              <Text style={{ ...type.caption, color: T.ink3 }}>{t('item.suggest.applied')}</Text>
            </View>
          ) : null}
        </DetailCard>

        <View
          style={{
            backgroundColor: T.card,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: T.dividerSoft,
            padding: 16,
            gap: 12,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <SystemIcon name="sparkle" size={16} color={T.accent} strokeWidth={1.9} />
            <Text style={{ ...type.footnote, fontWeight: '700', color: T.ink }}>
              {t('item.aiAdvice.title')}
            </Text>
          </View>
          <Text style={{ ...type.callout, color: T.ink2 }}>{aiAdvice}</Text>
          <Button
            label={t('item.aiAdvice.cta')}
            variant="tonal"
            onPress={openAskWithItem}
            icon={<SystemIcon name="sparkle" size={15} color={T.ink} strokeWidth={1.9} />}
            disabled={Boolean(showcaseItem)}
          />
        </View>

        <View
          style={{
            backgroundColor: T.card,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: T.dividerSoft,
            padding: 16,
            gap: 12,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Text style={{ ...type.footnote, fontWeight: '700', color: T.ink }}>{t('item.wearLog')}</Text>
            <Text style={{ ...type.caption, color: T.ink3 }}>{t('item.wearLog.period')}</Text>
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
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
            <Text style={{ ...type.caption, color: T.ink3, flex: 1 }}>
              {t('item.wornTotal', { count: backendItem?.wearCount ?? 0 })}
              {backendItem?.purchasePrice && (backendItem?.wearCount ?? 0) > 0
                ? ` · ${t('item.costPerWear', { amount: Math.round(backendItem.purchasePrice / Math.max(1, backendItem.wearCount ?? 1)) })}`
                : ''}
            </Text>
            <Text style={{ ...type.caption, color: T.ink3 }}>
              {backendItem?.lastWorn
                ? t('item.lastWorn', { date: backendItem.lastWorn })
                : t('item.wearLog.period')}
            </Text>
          </View>
        </View>
      </ScrollView>

      {isDirty ? (
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: 34,
            backgroundColor: T.card,
            borderTopWidth: 1,
            borderTopColor: T.divider,
            gap: 10,
            ...shadow.soft,
          }}
        >
          <Text style={{ ...type.footnote, fontWeight: '600', color: T.ink }}>
            {t('item.unsavedChanges')}
          </Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button label={t('common.cancel')} variant="secondary" onPress={resetDraft} style={{ flex: 1 }} />
            <Button
              label={t('common.save')}
              onPress={() => update.mutate(draft)}
              loading={update.isPending}
              disabled={update.isPending}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      ) : null}

      <BottomSheet visible={menuOpen} onClose={() => setMenuOpen(false)} title={t('item.moreActions')}>
        {/* 2×2 action grid — card cells, icon above label */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          <MenuAction
            cardWidth={(width - 48 - 10) / 2}
            label={t('item.action.reidentify')}
            icon="refresh"
            disabled={reidentifyDisabled}
            onPress={() => undefined}
          />
          <MenuAction
            cardWidth={(width - 48 - 10) / 2}
            label={t('item.action.moveLocation')}
            icon="wardrobe"
            onPress={focusLocation}
          />
          <MenuAction
            cardWidth={(width - 48 - 10) / 2}
            label={
              draft.status === 'unavailable'
                ? t('item.action.markWearable')
                : t('item.action.markUnavailable')
            }
            icon={draft.status === 'unavailable' ? 'check' : 'x'}
            onPress={() => {
              const next = draft.status === 'unavailable' ? 'wearable' : 'unavailable';
              setDraft((c) => ({ ...c, status: next }));
              setMenuOpen(false);
            }}
          />
          <MenuAction
            cardWidth={(width - 48 - 10) / 2}
            label={t('common.delete')}
            icon="trash"
            destructive
            disabled={Boolean(showcaseItem)}
            onPress={() => {
              setMenuOpen(false);
              confirmDelete();
            }}
          />
        </View>
      </BottomSheet>

      <BottomSheet visible={nameSheetOpen} onClose={() => setNameSheetOpen(false)} title={t('item.editName')}>
        <TextInput
          value={nameDraft}
          onChangeText={setNameDraft}
          placeholder={t('item.name.placeholder')}
          placeholderTextColor={T.ink4}
          autoFocus
          style={{
            minHeight: 50,
            borderRadius: radius.sm,
            borderWidth: 1,
            borderColor: T.divider,
            paddingHorizontal: 14,
            ...type.body,
            color: T.ink,
          }}
        />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button
            label={t('common.cancel')}
            variant="secondary"
            onPress={() => setNameSheetOpen(false)}
            style={{ flex: 1 }}
          />
          <Button
            label={t('common.save')}
            onPress={() => {
              const trimmed = nameDraft.trim();
              setDraft((c) => ({ ...c, name: trimmed || null }));
              setNameSheetOpen(false);
            }}
            style={{ flex: 1 }}
          />
        </View>
      </BottomSheet>

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
