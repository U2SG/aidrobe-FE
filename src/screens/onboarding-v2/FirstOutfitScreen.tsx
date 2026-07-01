import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { getTodayRecommendation } from '@/api/recommendations';
import { listWardrobeItems } from '@/api/wardrobe';
import { resolveOutfitPieces } from '@/components/outfit/resolvePieces';
import { FirstOutfitActivationCard } from '@/components/product/FirstOutfitActivationCard';
import { SlotGapEmptyState } from '@/components/product/SlotGapEmptyState';
import { AIOrb } from '@/components/ui/AIOrb';
import { useT } from '@/hooks/useT';
import type { I18nKey } from '@/i18n';
import { useTrack } from '@/hooks/useTrack';
import {
  countByCategory,
  deriveFirstOutfitState,
  missingCoreSlots,
} from '@/screens/onboarding-v2/firstOutfit';
import { buildRecommendationReasons } from '@/screens/today-v2/todayReasons';
import { colors, radius, type } from '@/theme/design';
import type { WardrobeItem } from '@/types/api';
import type { WardrobeStackParamList } from '@/types/navigation';

type Props = NativeStackScreenProps<WardrobeStackParamList, 'FirstOutfit'>;

const PROCESSING_STAGES: I18nKey[] = [
  'firstOutfit.stage.recognize',
  'firstOutfit.stage.organize',
  'firstOutfit.stage.compose',
];

export function FirstOutfitScreen({ navigation }: Props) {
  const { t } = useT();
  const track = useTrack();

  const todayQuery = useQuery({
    queryKey: ['todayRecommendation'],
    queryFn: () => getTodayRecommendation('commute'),
    retry: 1,
  });
  const wardrobeQuery = useQuery({
    queryKey: ['wardrobeItems', {}],
    queryFn: () => listWardrobeItems({}),
    staleTime: 60 * 1000,
  });

  const outfits = todayQuery.data?.outfits ?? [];
  const state = deriveFirstOutfitState({
    isLoading: todayQuery.isLoading,
    isError: todayQuery.isError,
    todayState: todayQuery.data?.state,
    feasibleOutfitCount: outfits.length,
  });

  const goToday = () => {
    track('first_outfit_generated', { outfitCount: outfits.length });
    // Pop the activation gate off the Wardrobe stack first, so returning to the
    // Wardrobe tab later lands on the list — not back on this headerless gate —
    // then cross-tab jump into Today.
    navigation.popToTop();
    navigation.getParent()?.navigate('TodayTab' as never);
  };

  const items: WardrobeItem[] = wardrobeQuery.data?.items ?? [];
  const itemById = new Map(items.map((it) => [it.id, it]));

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 72, paddingBottom: 48, gap: 20 }}
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
            onPress={() => todayQuery.refetch()}
            style={{ height: 48, paddingHorizontal: 24, borderRadius: radius.md, backgroundColor: colors.label, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ ...type.headline, color: colors.inverse }}>{t('firstOutfit.failed.retry')}</Text>
          </Pressable>
        </View>
      ) : null}

      {state === 'no_outfit' ? (
        <View style={{ gap: 20 }}>
          <View style={{ gap: 6 }}>
            <Text style={{ ...type.title1, color: colors.label }}>{t('firstOutfit.gap.title')}</Text>
            <Text style={{ ...type.body, color: colors.tertiaryLabel }}>{t('firstOutfit.gap.subtitle')}</Text>
          </View>
          <SlotGapEmptyState
            missingSlots={missingCoreSlots(countByCategory(items))}
            onAddItem={() => navigation.navigate('AddItem')}
          />
        </View>
      ) : null}

      {state === 'single_outfit' || state === 'ready' ? (
        <View style={{ gap: 20 }}>
          <View style={{ gap: 6 }}>
            <Text style={{ ...type.title1, color: colors.label }}>{t('firstOutfit.ready.title')}</Text>
            <Text style={{ ...type.body, color: colors.tertiaryLabel }}>{t('firstOutfit.ready.subtitle')}</Text>
          </View>
          <FirstOutfitActivationCard
            outfit={outfits[0]!}
            pieces={resolveOutfitPieces(outfits[0]!, itemById)}
            reasons={buildRecommendationReasons(outfits[0]!)}
            isSingle={state === 'single_outfit'}
            onWear={goToday}
          />
        </View>
      ) : null}
    </ScrollView>
  );
}
