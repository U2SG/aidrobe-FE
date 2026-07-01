import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { getTodayRecommendation, refreshTodayRecommendation } from '@/api/recommendations';
import { getUserSettings } from '@/api/settings';
import { getWardrobeItem } from '@/api/wardrobe';
import { resolveOutfitPieces } from '@/components/outfit/resolvePieces';
import { ContextOverrideBar, type ContextOverrideSuggestion } from '@/components/product/ContextOverrideBar';
import { DecisionOutfitCard } from '@/components/product/DecisionOutfitCard';
import { ResurfaceInsightCard, type ResurfaceInsight } from '@/components/product/ResurfaceInsightCard';
import { SystemIcon } from '@/components/ui/SystemIcon';
import { useT } from '@/hooks/useT';
import type { I18nKey } from '@/i18n';
import { useTrack } from '@/hooks/useTrack';
import { todayBoardMode } from '@/screens/today/todayBoard';
import { deriveTodayMode, isTomorrowOriented, wearLabelKeyForMode, type TodayMode } from '@/screens/today-v2/todayMode';
import { buildRecommendationReasons } from '@/screens/today-v2/todayReasons';
import { useToastStore } from '@/store/toast';
import { colors, radius, type } from '@/theme/design';
import type { WardrobeItem } from '@/types/api';
import type { TodayStackParamList } from '@/types/navigation';

type Props = NativeStackScreenProps<TodayStackParamList, 'Today'>;

// Context override chips (brief v0.9 §5.4). labelKey → i18n; payload is the free
// text an override represents (tracked + sent to refresh).
const OVERRIDE_SUGGESTIONS: ContextOverrideSuggestion[] = [
  { id: 'meeting', labelKey: 'today.override.chip.meeting', payload: '今天有会' },
  { id: 'comfy', labelKey: 'today.override.chip.comfy', payload: '想舒服一点' },
  { id: 'noSkirt', labelKey: 'today.override.chip.noSkirt', payload: '不想穿裙子' },
  { id: 'walk', labelKey: 'today.override.chip.walk', payload: '要走很多路' },
  { id: 'lowKey', labelKey: 'today.override.chip.lowKey', payload: '想低调一点' },
  { id: 'coldOffice', labelKey: 'today.override.chip.coldOffice', payload: '办公室有点冷' },
  { id: 'stayIn', labelKey: 'today.override.chip.stayIn', payload: '不怎么出门' },
];

const MODE_COPY: Record<TodayMode, { title: I18nKey; subtitle: I18nKey }> = {
  morning_today: { title: 'today.mode.morning.title', subtitle: 'today.mode.morning.subtitle' },
  daytime_today: { title: 'today.mode.daytime.title', subtitle: 'today.mode.daytime.subtitle' },
  evening_tomorrow: { title: 'today.mode.evening.title', subtitle: 'today.mode.evening.subtitle' },
  late_night_tomorrow: { title: 'today.mode.lateNight.title', subtitle: 'today.mode.lateNight.subtitle' },
  empty_or_cold_start: { title: 'today.mode.cold.title', subtitle: 'today.mode.cold.subtitle' },
};

export function TodayV2Screen({ navigation }: Props) {
  const { t } = useT();
  const track = useTrack();
  const qc = useQueryClient();
  const showToast = useToastStore((s) => s.show);

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

  // Refresh weather on re-focus (skip the initial mount focus), matching V1.
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

  // One outfit only — the first the backend returned. No strategy selection.
  const outfit = todayQuery.data?.outfits?.[0];

  const itemIds = useMemo(() => (outfit ? outfit.items.map((i) => i.id) : []), [outfit]);
  const itemQueries = useQueries({
    queries: itemIds.map((id) => ({
      queryKey: ['wardrobeItem', id],
      queryFn: () => getWardrobeItem(id),
      staleTime: 60 * 1000,
    })),
  });
  const itemById = new Map<string, WardrobeItem>();
  for (const q of itemQueries) if (q.data) itemById.set(q.data.id, q.data);

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

  const boardMode = todayBoardMode({
    state: todayQuery.data?.state,
    hasApiOutfit: Boolean(outfit?.id),
  });
  const hasRecommendation = boardMode === 'real';
  const departureTime = settingsQuery.data?.departureTime ?? null;
  const mode = deriveTodayMode({
    now: new Date(),
    departureTime,
    hasTodayRecommendation: hasRecommendation,
  });

  const weather = todayQuery.data?.context?.weather ?? null;
  const hint = useMemo(() => {
    const parts: string[] = [];
    if (weather) parts.push(`${Math.round(weather.temperatureC)}° ${weather.condition}`);
    const prep = outfit?.scores?.prepMinutes;
    if (prep) parts.push(t('today.v2.prepHint', { minutes: prep }));
    return parts.join(' · ') || null;
  }, [weather, outfit, t]);

  // Real resurface insight only — none available from the BE yet, so this stays
  // null and the card renders nothing (never a fabricated nudge).
  const resurfaceInsight: ResurfaceInsight | null = null;

  const modeCopy = MODE_COPY[mode];
  // Evening / late-night switch focus to tomorrow. The BE has no tomorrow
  // endpoint yet (API_GAP): we surface today's outfit as a tomorrow *preview*.
  // The CTA copy flips (wearLabelKeyForMode) AND today-framed reasons + the
  // live weather hint are dropped in favour of a neutral preview label, so no
  // stale "today" framing shows at night (brief §4.4). Swap into a real tomorrow
  // feed when the contract lands.
  const tomorrowOriented = isTomorrowOriented(mode);

  // Today impression tracking — parity with V1 TodayScreen (fires on mode change
  // too, so evening/tomorrow views aren't undercounted).
  useEffect(() => {
    if (hasRecommendation) track('today_viewed', { mode });
  }, [mode, hasRecommendation, track]);

  const submitOverride = (payload: string) => {
    track('context_override_submitted', { payload, surface: 'today' });
    // API_GAP: the BE /today refresh takes only a coarse `scene`, not free-text
    // override context. Until the contract accepts it, we acknowledge + refresh;
    // the payload is tracked so the override intent is not silently dropped.
    refreshMutation.mutate();
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 64, paddingBottom: 120, gap: 20 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ gap: 6 }}>
        <Text style={{ ...type.title1, color: colors.label }}>{t(modeCopy.title)}</Text>
        <Text style={{ ...type.body, color: colors.tertiaryLabel }}>{t(modeCopy.subtitle)}</Text>
      </View>

      {hasRecommendation && outfit ? (
        <>
          <DecisionOutfitCard
            outfit={outfit}
            pieces={resolveOutfitPieces(outfit, itemById)}
            reasons={tomorrowOriented ? [] : buildRecommendationReasons(outfit)}
            hint={tomorrowOriented ? t('today.v2.tomorrowPreview') : hint}
            wearLabelKey={wearLabelKeyForMode(mode)}
            onWear={() => {
              track('outfit_worn', { outfitId: outfit.id });
              navigation.navigate('OutfitDetail', { outfitId: outfit.id });
            }}
            onSwap={() => refreshMutation.mutate()}
            onViewDetail={() => navigation.navigate('OutfitDetail', { outfitId: outfit.id })}
            swapBusy={refreshMutation.isPending}
          />

          <ResurfaceInsightCard insight={resurfaceInsight} />

          <ContextOverrideBar
            suggestions={OVERRIDE_SUGGESTIONS}
            onSelectSuggestion={submitOverride}
            onSubmitText={submitOverride}
            disabled={refreshMutation.isPending}
          />
        </>
      ) : (
        <View
          style={{
            borderRadius: radius.xl,
            backgroundColor: colors.secondaryElevated,
            borderWidth: 1,
            borderColor: colors.separatorSoft,
            padding: 24,
            alignItems: 'center',
            gap: 10,
          }}
        >
          <SystemIcon name="sparkle" size={22} color={colors.accent} strokeWidth={1.8} />
          <Text style={{ ...type.headline, color: colors.label, textAlign: 'center' }}>
            {t('today.cantBuild')}
          </Text>
          <Text style={{ ...type.callout, color: colors.tertiaryLabel, textAlign: 'center' }}>
            {t('today.notEnoughData.hint')}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}
