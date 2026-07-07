import { Pressable, Text, View } from 'react-native';

import { OutfitBoard } from '@/components/outfit/OutfitBoard';
import type { GarmentPiece } from '@/components/outfit/garments';
import { RecommendationReasonList } from '@/components/product/RecommendationReasonList';
import { SystemIcon } from '@/components/ui/SystemIcon';
import { useT } from '@/hooks/useT';
import { colors, radius, shadow, type } from '@/theme/design';
import type { OutfitSummary, RecommendationReason } from '@/types/api';

// The first outfit reveal (brief v0.9 §6.3). Shows the one real outfit + its
// reasons and a single continue CTA. In the single-outfit state it shows a
// footnote and an "add more" text link — no swap button (there's no second
// feasible outfit). Visual language mirrors DecisionOutfitCard from Today v2.
export function FirstOutfitActivationCard({
  outfit,
  pieces,
  reasons,
  isSingle,
  onWear,
  onAddMore,
  onToggleFavorite,
  isFavorited,
}: {
  outfit: OutfitSummary;
  pieces: GarmentPiece[];
  reasons: RecommendationReason[];
  isSingle?: boolean;
  onWear: () => void;
  /** Navigate to AddItem — shown as text link in the single-outfit state. */
  onAddMore?: () => void;
  onToggleFavorite?: () => void;
  isFavorited?: boolean;
}) {
  const { t } = useT();

  // Style descriptor: use outfit title when present (e.g. "正式通勤 · 舒适利落").
  // The outfit.title field is always a string on OutfitSummary but may be an
  // empty string when the BE hasn't provided one — treat empty as absent.
  const styleDescriptor = outfit.title.trim() || null;

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
      {/* Header: badge + style descriptor + favorite heart */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={{ ...type.footnote, color: colors.accent, fontWeight: '700', letterSpacing: 0.6 }}>
            {t('firstOutfit.badge')}
          </Text>
          {styleDescriptor ? (
            <Text style={{ ...type.callout, color: colors.tertiaryLabel }}>{styleDescriptor}</Text>
          ) : null}
        </View>
        {onToggleFavorite ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t(isFavorited ? 'today.v2.unfavorite' : 'today.v2.favorite')}
            onPress={onToggleFavorite}
            hitSlop={8}
            style={{ padding: 2 }}
          >
            <SystemIcon
              name="heart"
              size={22}
              color={isFavorited ? colors.accent : colors.quaternaryLabel}
              strokeWidth={1.8}
              fill={isFavorited ? colors.accent : 'none'}
            />
          </Pressable>
        ) : null}
      </View>

      <OutfitBoard pieces={pieces} />

      <View style={{ height: 1, backgroundColor: colors.separatorSoft }} />

      {/* Reasons header + list */}
      {reasons.length > 0 ? (
        <View style={{ gap: 10 }}>
          <Text style={{ ...type.headline, color: colors.label }}>
            {t('firstOutfit.reasonsHeader')}
          </Text>
          <RecommendationReasonList reasons={reasons} />
        </View>
      ) : null}

      {/* Warm quote box — accentSoft surface + agentGlow quotation mark */}
      <View
        style={{
          flexDirection: 'row',
          gap: 8,
          borderRadius: radius.md,
          backgroundColor: colors.accentSoft,
          paddingVertical: 12,
          paddingHorizontal: 14,
        }}
      >
        <Text style={{ ...type.title2, color: colors.agentGlow, lineHeight: 20 }}>&ldquo;</Text>
        <Text style={{ flex: 1, ...type.callout, color: colors.secondaryLabel, fontStyle: 'italic' }}>
          {t('firstOutfit.ready.quote')}
        </Text>
      </View>

      {/* Primary CTA — black full-width, 54h */}
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

      {/* "Add more" text link — always shown below the CTA */}
      {onAddMore ? (
        <Pressable
          accessibilityRole="button"
          onPress={onAddMore}
          hitSlop={6}
          style={{ alignItems: 'center' }}
        >
          <Text style={{ ...type.callout, color: colors.tertiaryLabel }}>{t('firstOutfit.addMore')}</Text>
        </Pressable>
      ) : null}

      {/* Footnote — single-outfit state only */}
      {isSingle ? (
        <Text style={{ ...type.footnote, color: colors.tertiaryLabel, textAlign: 'center' }}>
          {t('firstOutfit.singleHint')}
        </Text>
      ) : null}
    </View>
  );
}
