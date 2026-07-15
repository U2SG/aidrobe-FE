import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { getFirstOutfitGate } from '@/api/recommendations';
import { listWardrobeItems } from '@/api/wardrobe';
import { resolveOutfitPieces } from '@/components/outfit/resolvePieces';
import { FirstOutfitActivationCard } from '@/components/product/FirstOutfitActivationCard';
import { SlotGapEmptyState } from '@/components/product/SlotGapEmptyState';
import { AIOrb } from '@/components/ui/AIOrb';
import { SystemIcon } from '@/components/ui/SystemIcon';
import { useT } from '@/hooks/useT';
import type { I18nKey } from '@/i18n';
import { useTrack } from '@/hooks/useTrack';
import type { CoreSlot, FirstOutfitUiState } from '@/screens/onboarding-v2/firstOutfit';
import { buildRecommendationReasons } from '@/screens/today-v2/todayReasons';
import { colors, radius, type } from '@/theme/design';
import type { WardrobeItem } from '@/types/api';
import type { WardrobeStackParamList } from '@/types/navigation';

// Visual-only progress bar: static chrome matching prototype 4/6 — step state
// is not wired (no onboarding step tracker exists yet; this is a visual pass only).
const PROGRESS_STEPS = 6;
const PROGRESS_ACTIVE = 4;

function OnboardingProgressBar({ onBack }: { onBack?: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      {onBack ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="返回"
          onPress={onBack}
          hitSlop={8}
          style={{ padding: 4 }}
        >
          <SystemIcon name="chevronLeft" size={22} color={colors.label} strokeWidth={1.8} />
        </Pressable>
      ) : (
        <View style={{ width: 30 }} />
      )}
      <View style={{ flex: 1, flexDirection: 'row', gap: 4 }}>
        {Array.from({ length: PROGRESS_STEPS }).map((_, i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: 3,
              borderRadius: 2,
              backgroundColor: i < PROGRESS_ACTIVE ? colors.accent : colors.separatorSoft,
            }}
          />
        ))}
      </View>
    </View>
  );
}

type Props = NativeStackScreenProps<WardrobeStackParamList, 'FirstOutfit'>;

const PROCESSING_STAGES: I18nKey[] = [
  'firstOutfit.stage.recognize',
  'firstOutfit.stage.organize',
  'firstOutfit.stage.compose',
];

export function FirstOutfitScreen({ navigation, route }: Props) {
  const { t } = useT();
  const track = useTrack();
  // When re-hosted inside the onboarding stack this is 4/6; its "done" and
  // "add more" branches continue onboarding instead of the main app.
  const onboarding = route.params?.onboarding ?? false;

  // BE #79 — the gate verdict (state / missing slots / first outfit) comes from
  // the backend, derived from the same daily /today serves. No more FE
  // approximation from outfit counts.
  const gateQuery = useQuery({
    queryKey: ['firstOutfitGate'],
    queryFn: getFirstOutfitGate,
    retry: 1,
  });
  const wardrobeQuery = useQuery({
    queryKey: ['wardrobeItems', {}],
    queryFn: () => listWardrobeItems({}),
    staleTime: 60 * 1000,
  });

  const gate = gateQuery.data;
  const firstOutfit = gate?.firstOutfit ?? null;
  const state: FirstOutfitUiState = gateQuery.isLoading
    ? 'processing'
    : gateQuery.isError
      ? 'failed'
      : gate!.state === 'no_outfit' || firstOutfit == null
        ? 'no_outfit'
        : gate!.state;
  // BE slot vocabulary matches CoreSlot ('top'|'bottom'|'shoes'|'dress');
  // filter defensively so an unknown future slot never renders unmapped.
  const CORE_SLOTS: readonly CoreSlot[] = ['top', 'bottom', 'shoes', 'dress'];
  const missingSlots: CoreSlot[] = (gate?.missingSlots ?? []).filter((s): s is CoreSlot =>
    (CORE_SLOTS as readonly string[]).includes(s),
  );

  const goToday = () => {
    track('first_outfit_generated', { outfitCount: gate?.feasibleOutfitCount ?? 0 });
    if (onboarding) {
      // Onboarding 4/6 → advance to the optional style-memory step (5/6).
      navigation.navigate('StyleMemory' as never);
      return;
    }
    // Pop the activation gate off the Wardrobe stack first, so returning to the
    // Wardrobe tab later lands on the list — not back on this headerless gate —
    // then cross-tab jump into Today. Target the nested Today home explicitly:
    // TodayTab is a persistent stack, so a bare tab navigate would land on a
    // stale nested screen (e.g. a previously opened OutfitDetail) instead of home.
    navigation.popToTop();
    (
      navigation.getParent() as { navigate: (name: string, params?: object) => void } | undefined
    )?.navigate('TodayTab', { screen: 'Today' });
  };

  const items: WardrobeItem[] = wardrobeQuery.data?.items ?? [];
  const itemById = new Map(items.map((it) => [it.id, it]));

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 56, paddingBottom: 48, gap: 20 }}
      showsVerticalScrollIndicator={false}
    >
      {state === 'processing' ? (
        <View style={{ alignItems: 'center', gap: 24, paddingTop: 40 }}>
          <AIOrb variant="thinking" size={72} />
          <Text style={{ ...type.title2, color: colors.label, textAlign: 'center' }}>
            {t('firstOutfit.processing.title')}
          </Text>
          <View style={{ gap: 12, alignSelf: 'stretch' }}>
            {PROCESSING_STAGES.map((key) => (
              <Text key={key} style={{ ...type.callout, color: colors.tertiaryLabel, textAlign: 'center' }}>
                {t(key)}
              </Text>
            ))}
          </View>
        </View>
      ) : null}

      {state === 'failed' ? (
        <View style={{ alignItems: 'center', gap: 16, paddingTop: 40 }}>
          <Text style={{ ...type.title2, color: colors.label, textAlign: 'center' }}>
            {t('firstOutfit.failed.title')}
          </Text>
          <Text style={{ ...type.callout, color: colors.tertiaryLabel, textAlign: 'center' }}>
            {t('firstOutfit.failed.body')}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => gateQuery.refetch()}
            style={{ height: 48, paddingHorizontal: 24, borderRadius: radius.md, backgroundColor: colors.label, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ ...type.headline, color: colors.inverse }}>{t('firstOutfit.failed.retry')}</Text>
          </Pressable>
        </View>
      ) : null}

      {state === 'no_outfit' ? (
        <View style={{ gap: 20 }}>
          <OnboardingProgressBar onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined} />
          <View style={{ gap: 6 }}>
            <Text style={{ ...type.title1, color: colors.label }}>{t('firstOutfit.gap.title')}</Text>
            <Text style={{ ...type.body, color: colors.tertiaryLabel }}>{t('firstOutfit.gap.subtitle')}</Text>
          </View>
          <SlotGapEmptyState
            missingSlots={missingSlots}
            onAddItem={() => navigation.navigate((onboarding ? 'AddWardrobe' : 'AddItem') as never)}
          />
          {onboarding ? (
            // Forward path even with an incomplete wardrobe — onboarding must
            // never dead-end; the user can finish the flow and add items later.
            <Pressable
              accessibilityRole="button"
              onPress={() => navigation.navigate('StyleMemory' as never)}
              style={{
                height: 44,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ ...type.callout, color: colors.tertiaryLabel }}>
                {t('onboarding.styleMemory.skip')}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {state === 'single_outfit' || state === 'ready' ? (
        <View style={{ gap: 20 }}>
          <OnboardingProgressBar onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined} />
          <View style={{ gap: 6 }}>
            <Text style={{ ...type.title1, color: colors.label }}>{t('firstOutfit.ready.title')}</Text>
            <Text style={{ ...type.body, color: colors.tertiaryLabel }}>{t('firstOutfit.ready.subtitle')}</Text>
          </View>
          <FirstOutfitActivationCard
            outfit={firstOutfit!}
            pieces={resolveOutfitPieces(firstOutfit!, itemById)}
            reasons={buildRecommendationReasons(firstOutfit!)}
            isSingle={state === 'single_outfit'}
            onWear={goToday}
            onAddMore={() => navigation.navigate((onboarding ? 'AddWardrobe' : 'AddItem') as never)}
          />
        </View>
      ) : null}
    </ScrollView>
  );
}
