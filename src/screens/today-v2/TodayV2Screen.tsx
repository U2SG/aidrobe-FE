import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { emitRecommendationEvent } from '@/api/events';
import {
  favoriteOutfit,
  getTodayRecommendation,
  refreshTodayRecommendation,
  unfavoriteOutfit,
  type ContextOverride,
} from '@/api/recommendations';
import { getUserSettings } from '@/api/settings';
import { getWardrobeItem, listWardrobeItems } from '@/api/wardrobe';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingBlock } from '@/components/feedback/LoadingBlock';
import { resolveOutfitPieces } from '@/components/outfit/resolvePieces';
import { ContextOverrideBar, type ContextOverrideSuggestion } from '@/components/product/ContextOverrideBar';
import { DecisionOutfitCard } from '@/components/product/DecisionOutfitCard';
import { ResurfaceInsightCard, type ResurfaceInsight } from '@/components/product/ResurfaceInsightCard';
import { SlotGapEmptyState } from '@/components/product/SlotGapEmptyState';
import { CountdownRing } from '@/components/ui/CountdownRing';
import { SystemIcon } from '@/components/ui/SystemIcon';
import { useT } from '@/hooks/useT';
import type { I18nKey } from '@/i18n';
import { useTrack } from '@/hooks/useTrack';
import { countByCategory, missingCoreSlots } from '@/screens/onboarding-v2/firstOutfit';
import { todayBoardMode } from '@/screens/today/todayBoard';
import { deriveTodayMode, isTomorrowOriented, wearLabelKeyForMode, type TodayMode } from '@/screens/today-v2/todayMode';
import { buildRecommendationReasons } from '@/screens/today-v2/todayReasons';
import { useToastStore } from '@/store/toast';
import { colors, radius, type } from '@/theme/design';
import type { WardrobeItem } from '@/types/api';
import type { TodayStackParamList } from '@/types/navigation';

type Props = NativeStackScreenProps<TodayStackParamList, 'Today'>;

// Context override chips (brief v0.9 §5.4). labelKey → i18n; payload is the free
// text an override represents (tracked + sent to refresh). iconName is optional —
// only assigned where a clean SystemIcon glyph exists; others are text-only.
const OVERRIDE_SUGGESTIONS: ContextOverrideSuggestion[] = [
  { id: 'meeting', labelKey: 'today.override.chip.meeting', payload: '今天有会', iconName: 'suitcase' },
  { id: 'comfy', labelKey: 'today.override.chip.comfy', payload: '想舒服一点' },
  { id: 'noSkirt', labelKey: 'today.override.chip.noSkirt', payload: '不想穿裙子' },
  { id: 'walk', labelKey: 'today.override.chip.walk', payload: '要走很多路', iconName: 'compass' },
  { id: 'lowKey', labelKey: 'today.override.chip.lowKey', payload: '想低调一点' },
  { id: 'coldOffice', labelKey: 'today.override.chip.coldOffice', payload: '办公室有点冷' },
  { id: 'stayIn', labelKey: 'today.override.chip.stayIn', payload: '不怎么出门' },
];

const SCENE_LABEL: Record<string, string> = { commute: '通勤', formal: '正式', casual: '休闲' };

// Minutes until departure, clamped to the ring's [0, 90] range; null if unknown.
function remainingMinutes(departureTime: string | null): number | null {
  if (!departureTime) return null;
  const [h, m] = departureTime.split(':');
  const now = new Date();
  const dep = new Date(now);
  dep.setHours(Number(h ?? 8), Number(m ?? 30), 0, 0);
  const diff = Math.round((dep.getTime() - now.getTime()) / 60000);
  return Math.max(0, Math.min(90, diff));
}

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

  // BE#77 — evening/late-night is tomorrow-oriented BY TIME (>= 18:00), so the
  // decision which date to fetch can't depend on the fetch result. deriveTodayMode
  // with hasTodayRecommendation:true is a pure time probe here; the real mode
  // (incl. cold start) is derived below from actual data.
  const wantTomorrow = isTomorrowOriented(
    deriveTodayMode({
      now: new Date(),
      departureTime: null,
      hasTodayRecommendation: true,
    }),
  );
  const targetDate = useMemo(() => {
    if (!wantTomorrow) return undefined;
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
  }, [wantTomorrow]);

  const todayQuery = useQuery({
    queryKey: ['todayRecommendation', targetDate ?? 'today'],
    queryFn: () => getTodayRecommendation('commute', targetDate),
    staleTime: 60 * 1000,
    retry: 1,
  });
  // True only when the backend actually served tomorrow (flag on) — a flag-off
  // backend ignores target_date and this stays false → legacy preview framing.
  const serverTomorrowActive = todayQuery.data?.mode === 'tomorrow';

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
    // BE#78 — an optional context override rides along as a session-scoped
    // constraint on this one regeneration; plain swaps pass undefined.
    mutationFn: (override?: ContextOverride) => refreshTodayRecommendation('commute', override),
    onSuccess: (data) => {
      // Refresh regenerates TODAY only. Swap/override are permitted only while
      // the view is NOT a real tomorrow payload, so whatever key is active is
      // showing today's data (possibly under the flag-off evening preview key)
      // — write the ACTIVE key so the visible card updates, and the plain
      // 'today' key so a later daytime view isn't stale.
      qc.setQueryData(['todayRecommendation', targetDate ?? 'today'], data);
      if (targetDate) qc.setQueryData(['todayRecommendation', 'today'], data);
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

  // Only fetch the full wardrobe list when the recommendation is absent — so
  // normal days don't pay for the extra round-trip.
  const wardrobeQuery = useQuery({
    queryKey: ['wardrobeItems', 'coldStart'],
    queryFn: () => listWardrobeItems({ limit: 100 }),
    staleTime: 60 * 1000,
    enabled: todayQuery.isSuccess && !(hasRecommendation && outfit),
  });
  const coldStartMissingSlots = useMemo(() => {
    if (!wardrobeQuery.isSuccess) return null;
    const { items: fetched, total } = wardrobeQuery.data;
    // Only claim specific gaps when we've seen the WHOLE wardrobe — a partial
    // page could miss a category that exists past the page boundary, and a
    // fabricated "missing shoes" is worse than the generic copy.
    if (total > fetched.length) return null;
    return missingCoreSlots(countByCategory(fetched));
  }, [wardrobeQuery.isSuccess, wardrobeQuery.data]);
  const departureTime = settingsQuery.data?.departureTime ?? null;
  const mode = deriveTodayMode({
    now: new Date(),
    departureTime,
    hasTodayRecommendation: hasRecommendation,
    // In tomorrow mode the query result IS tomorrow's recommendation.
    hasTomorrowRecommendation: wantTomorrow ? hasRecommendation : undefined,
  });

  const weather = todayQuery.data?.context?.weather ?? null;
  const hint = useMemo(() => {
    const parts: string[] = [];
    if (weather) parts.push(`${Math.round(weather.temperatureC)}° ${weather.condition}`);
    const prep = outfit?.scores?.prepMinutes;
    if (prep) parts.push(t('today.v2.prepHint', { minutes: prep }));
    return parts.join(' · ') || null;
  }, [weather, outfit, t]);

  // BE#80 — real resurface insight from the Today payload only; absent → the
  // card renders nothing (never a fabricated nudge). Viewing it feeds the BE's
  // same-item cooldown via a weak resurface_insight_viewed event, once per id.
  const serverInsight = todayQuery.data?.resurfaceInsight ?? null;
  const resurfaceInsight: ResurfaceInsight | null = serverInsight
    ? { id: serverInsight.id, text: serverInsight.text, itemId: serverInsight.itemId }
    : null;
  const lastViewedInsightId = useRef<string | null>(null);
  useEffect(() => {
    if (serverInsight && lastViewedInsightId.current !== serverInsight.id) {
      lastViewedInsightId.current = serverInsight.id;
      emitRecommendationEvent({
        eventType: 'resurface_insight_viewed',
        signalStrength: 'weak',
        sourceSurface: 'today',
        itemId: serverInsight.itemId,
      });
    }
  }, [serverInsight]);
  const openResurfaceItem = (insight: ResurfaceInsight) => {
    if (insight.itemId) {
      emitRecommendationEvent({
        eventType: 'resurface_item_opened',
        signalStrength: 'medium',
        sourceSurface: 'today',
        itemId: insight.itemId,
      });
      (
        navigation.getParent() as { navigate: (name: string, params?: object) => void } | undefined
      )?.navigate('WardrobeTab', { screen: 'ItemDetail', params: { itemId: insight.itemId } });
    }
  };

  const modeCopy = MODE_COPY[mode];
  // Evening / late-night switch focus to tomorrow. The BE has no tomorrow
  // endpoint yet (API_GAP): we surface today's outfit as a tomorrow *preview*.
  // The CTA copy flips (wearLabelKeyForMode) AND today-framed reasons + the
  // live weather hint are dropped in favour of a neutral preview label, so no
  // stale "today" framing shows at night (brief §4.4). Swap into a real tomorrow
  // feed when the contract lands.
  const tomorrowOriented = isTomorrowOriented(mode);

  const scene = SCENE_LABEL[todayQuery.data?.context?.scene ?? 'commute'] ?? '通勤';
  const remaining = remainingMinutes(departureTime);
  // The departure countdown ring is a morning "getting ready" affordance only —
  // not after departure and not at night.
  const showRing = mode === 'morning_today' && remaining != null && remaining > 0;
  const headerSubtitle = showRing
    ? t('today.v2.departureCountdown', { minutes: remaining as number, scene })
    : t(modeCopy.subtitle);

  // Context override sheet open/close state.
  const [overrideSheetOpen, setOverrideSheetOpen] = useState(false);

  // Favorite (heart) — optimistic local state backed by the outfit API.
  const [favorited, setFavorited] = useState(false);
  useEffect(() => setFavorited(outfit?.isFavorited ?? false), [outfit?.id, outfit?.isFavorited]);
  const toggleFavorite = () => {
    if (!outfit?.id) return;
    const next = !favorited;
    setFavorited(next);
    (next ? favoriteOutfit(outfit.id) : unfavoriteOutfit(outfit.id)).catch(() => setFavorited(!next));
  };

  // Today impression tracking — parity with V1 TodayScreen (fires on mode change
  // too, so evening/tomorrow views aren't undercounted).
  useEffect(() => {
    if (hasRecommendation) track('today_viewed', { mode });
  }, [mode, hasRecommendation, track]);

  // BE#78 — chips carry chip identity (deterministic constraint mapping on the
  // BE); free text goes through the BE's LLM parse. The BE emits the
  // context_override_submitted learning event server-side — no client event.
  const submitChipOverride = (suggestion: ContextOverrideSuggestion) => {
    track('context_override_submitted', { payload: suggestion.payload, surface: 'today' });
    refreshMutation.mutate({ source: 'chip', chipId: suggestion.id, text: suggestion.payload });
  };
  const submitTextOverride = (text: string) => {
    track('context_override_submitted', { payload: text, surface: 'today' });
    refreshMutation.mutate({ source: 'free_text', text });
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 64, paddingBottom: 120, gap: 20 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header: mode-aware greeting + departure subtitle, with the countdown
          ring on the right (morning/today only). Matches the handoff Today. */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={{ ...type.largeTitle, color: colors.label }}>{t(modeCopy.title)}</Text>
          <Text style={{ ...type.footnote, color: colors.tertiaryLabel }}>{headerSubtitle}</Text>
        </View>
        {showRing && remaining != null ? <CountdownRing minutes={remaining} /> : null}
      </View>

      {todayQuery.isLoading ? (
        <LoadingBlock />
      ) : todayQuery.isError ? (
        <ErrorState onRetry={() => todayQuery.refetch()} />
      ) : hasRecommendation && outfit ? (
        <>
          <DecisionOutfitCard
            outfit={outfit}
            pieces={resolveOutfitPieces(outfit, itemById)}
            // BE#77 — with a REAL tomorrow payload the reasons/weather/quote are
            // tomorrow's own (forecast context), so show them; the neutral
            // preview framing remains only for flag-off backends.
            reasons={
              tomorrowOriented && !serverTomorrowActive ? [] : buildRecommendationReasons(outfit)
            }
            hint={tomorrowOriented && !serverTomorrowActive ? t('today.v2.tomorrowPreview') : hint}
            quote={
              tomorrowOriented && !serverTomorrowActive
                ? null
                : todayQuery.data?.guidanceText ?? null
            }
            isFavorited={favorited}
            onToggleFavorite={toggleFavorite}
            wearLabelKey={wearLabelKeyForMode(mode)}
            temperatureC={weather?.temperatureC ?? null}
            onWear={() => {
              track('outfit_worn', { outfitId: outfit.id });
              navigation.navigate('OutfitDetail', { outfitId: outfit.id });
            }}
            // Refresh regenerates TODAY only (no tomorrow-swap contract), so
            // swapping is disabled while a real tomorrow payload is shown.
            onSwap={() => {
              if (serverTomorrowActive) return;
              refreshMutation.mutate(undefined);
            }}
            onViewDetail={() => navigation.navigate('OutfitDetail', { outfitId: outfit.id })}
            swapBusy={refreshMutation.isPending || serverTomorrowActive}
          />

          <ResurfaceInsightCard insight={resurfaceInsight} onPress={openResurfaceItem} />

          {/* Compact entry row — opens the context override sheet */}
          <Pressable
            accessibilityRole="button"
            onPress={() => setOverrideSheetOpen(true)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              paddingVertical: 14,
              paddingHorizontal: 16,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: colors.separator,
              backgroundColor: colors.elevated,
            }}
          >
            <SystemIcon name="sparkle" size={16} color={colors.tertiaryLabel} strokeWidth={1.6} />
            <Text style={{ flex: 1, ...type.callout, color: colors.tertiaryLabel }}>
              {t('today.override.entryLabel')}
            </Text>
            <SystemIcon name="chevronRight" size={16} color={colors.quaternaryLabel} strokeWidth={1.6} />
          </Pressable>

          <ContextOverrideBar
            visible={overrideSheetOpen}
            onClose={() => setOverrideSheetOpen(false)}
            suggestions={OVERRIDE_SUGGESTIONS}
            onSelectSuggestion={submitChipOverride}
            onSubmitText={submitTextOverride}
            disabled={refreshMutation.isPending}
          />
        </>
      ) : coldStartMissingSlots && coldStartMissingSlots.length > 0 ? (
        // Wardrobe has real gaps — point at exactly what to add.
        <SlotGapEmptyState
          missingSlots={coldStartMissingSlots}
          onAddItem={() =>
            navigation.getParent()?.navigate('WardrobeTab', { screen: 'AddItem' } as never)
          }
        />
      ) : (
        // Wardrobe adequate (or query loading/failed) — keep honest generic copy.
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
