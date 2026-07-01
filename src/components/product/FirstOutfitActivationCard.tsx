import { Pressable, Text, View } from 'react-native';

import { OutfitBoard } from '@/components/outfit/OutfitBoard';
import type { GarmentPiece } from '@/components/outfit/garments';
import { RecommendationReasonList } from '@/components/product/RecommendationReasonList';
import { useT } from '@/hooks/useT';
import { colors, radius, shadow, type } from '@/theme/design';
import type { OutfitSummary, RecommendationReason } from '@/types/api';

// The first outfit reveal (brief v0.9 §6.3). Shows the one real outfit + its
// reasons and a single continue CTA. In the single-outfit state it does NOT
// expose a swap (there is no second feasible outfit) — instead it explains that
// a few more items unlock more looks.
export function FirstOutfitActivationCard({
  outfit,
  pieces,
  reasons,
  isSingle,
  onWear,
}: {
  outfit: OutfitSummary;
  pieces: GarmentPiece[];
  reasons: RecommendationReason[];
  isSingle?: boolean;
  onWear: () => void;
}) {
  const { t } = useT();

  return (
    <View
      style={{
        borderRadius: radius.xl,
        backgroundColor: colors.elevated,
        borderWidth: 1,
        borderColor: colors.separatorSoft,
        padding: 18,
        gap: 14,
        ...shadow.elevated,
      }}
    >
      <View style={{ gap: 3 }}>
        <Text style={{ ...type.footnote, color: colors.accent, fontWeight: '700', letterSpacing: 0.6 }}>
          {t('firstOutfit.badge')}
        </Text>
        <Text style={{ ...type.title2, color: colors.label }}>{outfit.title || t('firstOutfit.title')}</Text>
      </View>

      <OutfitBoard pieces={pieces} />

      <View style={{ height: 1, backgroundColor: colors.separatorSoft }} />

      <RecommendationReasonList reasons={reasons} />

      {isSingle ? (
        <Text style={{ ...type.footnote, color: colors.tertiaryLabel }}>{t('firstOutfit.singleHint')}</Text>
      ) : null}

      <Pressable
        accessibilityRole="button"
        onPress={onWear}
        style={({ pressed }) => ({
          height: 54,
          borderRadius: radius.md,
          backgroundColor: colors.label,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.88 : 1,
        })}
      >
        <Text style={{ ...type.headline, color: colors.inverse }}>{t('firstOutfit.wear')}</Text>
      </Pressable>
    </View>
  );
}
