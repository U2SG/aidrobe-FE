import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { OutfitBoard } from '@/components/outfit/OutfitBoard';
import type { GarmentPiece } from '@/components/outfit/garments';
import { RecommendationFeedback } from '@/components/feedback/RecommendationFeedback';
import { AIOrb } from '@/components/ui/AIOrb';
import { SystemIcon } from '@/components/ui/SystemIcon';
import { useT } from '@/hooks/useT';
import { colors, radius, shadow, type } from '@/theme/design';
import type { OutfitSummary, RecommendationReason } from '@/types/api';

import { RecommendationReasonList } from './RecommendationReasonList';

type Props = {
  outfit: OutfitSummary;
  pieces: GarmentPiece[];
  reasons: RecommendationReason[];
  /** e.g. "28° 多云 · 准备 5 分" — real weather/time hint, may be null. */
  hint?: string | null;
  onWear: () => void;
  onSwap: () => void;
  onViewDetail: () => void;
  /** Hidden in the single-outfit cold-start state (swap would always fail). */
  showSwap?: boolean;
  swapBusy?: boolean;
};

// The one decision outfit for Today v2 (brief v0.9 §5): a single real outfit, its
// reasons, and soft-language actions. No strategy rail, no candidate menu — swap
// is a fallback, not a picker. "不喜欢" reveals the structured feedback chips
// inline; "为什么" opens the full reasoning in the detail screen.
export function DecisionOutfitCard({
  outfit,
  pieces,
  reasons,
  hint,
  onWear,
  onSwap,
  onViewDetail,
  showSwap = true,
  swapBusy,
}: Props) {
  const { t } = useT();
  const [showFeedback, setShowFeedback] = useState(false);

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
        <Text style={{ ...type.title2, color: colors.label }}>{outfit.title || t('today.v2.outfitTitle')}</Text>
        {hint ? <Text style={{ ...type.footnote, color: colors.tertiaryLabel }}>{hint}</Text> : null}
      </View>

      <OutfitBoard pieces={pieces} />

      <View style={{ height: 1, backgroundColor: colors.separatorSoft }} />

      <RecommendationReasonList reasons={reasons} />

      {/* Primary action — soft language, never "you must wear this". */}
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
        <Text style={{ ...type.headline, color: colors.inverse }}>{t('today.v2.wear')}</Text>
      </Pressable>

      {/* Secondary actions: swap (fallback) / dislike / why. */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 18 }}>
        {showSwap ? (
          <Pressable
            accessibilityRole="button"
            disabled={swapBusy}
            onPress={onSwap}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
          >
            {swapBusy ? (
              <AIOrb variant="thinking" size={18} />
            ) : (
              <SystemIcon name="refresh" size={16} color={colors.tertiaryLabel} strokeWidth={2} />
            )}
            <Text style={{ ...type.callout, color: colors.tertiaryLabel }}>{t('today.v2.swap')}</Text>
          </Pressable>
        ) : null}
        <Pressable accessibilityRole="button" onPress={() => setShowFeedback((v) => !v)}>
          <Text style={{ ...type.callout, color: colors.tertiaryLabel }}>{t('today.v2.dislike')}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onViewDetail}>
          <Text style={{ ...type.callout, color: colors.tertiaryLabel }}>{t('today.v2.why')}</Text>
        </Pressable>
      </View>

      {showFeedback ? (
        <View style={{ borderTopWidth: 1, borderTopColor: colors.separatorSoft, paddingTop: 14 }}>
          <RecommendationFeedback outfitId={outfit.id} />
        </View>
      ) : null}
    </View>
  );
}
