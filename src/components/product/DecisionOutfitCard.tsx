import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { OutfitBoard } from '@/components/outfit/OutfitBoard';
import type { GarmentPiece } from '@/components/outfit/garments';
import { RecommendationFeedback } from '@/components/feedback/RecommendationFeedback';
import { SystemIcon } from '@/components/ui/SystemIcon';
import { useT } from '@/hooks/useT';
import type { I18nKey } from '@/i18n';
import { colors, radius, shadow, type } from '@/theme/design';
import type { OutfitSummary, RecommendationReason } from '@/types/api';

import { RecommendationReasonList } from './RecommendationReasonList';

type Props = {
  outfit: OutfitSummary;
  pieces: GarmentPiece[];
  reasons: RecommendationReason[];
  /** e.g. "28° 多云 · 准备 5 分" — real weather/time hint, may be null. */
  hint?: string | null;
  /** Warm one-line rationale shown in the quote box (from guidanceText). */
  quote?: string | null;
  isFavorited?: boolean;
  onToggleFavorite?: () => void;
  /** Primary CTA label — mode-aware ("try today" vs "set for tomorrow") so
   *  evening/late-night never shows stale "wear today" copy (brief §4.4). */
  wearLabelKey?: I18nKey;
  onWear: () => void;
  onSwap: () => void;
  onViewDetail: () => void;
  /** Hidden in the single-outfit cold-start state (swap would always fail). */
  showSwap?: boolean;
  swapBusy?: boolean;
  /** Outdoor temperature, passed to feedback for indoor-climate signal (§9.2). */
  temperatureC?: number | null;
};

// The one decision outfit for Today v2 (brief v0.9 §5; visual = design handoff
// Today baseline): "今日一套" header + favorite, weather line, flat-lay board,
// 2–3 reasons with source, a warm quote box, one black CTA, and soft text links
// (查看详情 / 不喜欢 / 换一套). "不喜欢" reveals the feedback chips inline.
export function DecisionOutfitCard({
  outfit,
  pieces,
  reasons,
  hint,
  quote,
  isFavorited,
  onToggleFavorite,
  wearLabelKey = 'today.v2.wear',
  onWear,
  onSwap,
  onViewDetail,
  showSwap = true,
  swapBusy,
  temperatureC,
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
      {/* Header: 今日一套 + favorite heart */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={{ ...type.title2, color: colors.label }}>{t('today.v2.outfitTitle')}</Text>
          {hint ? <Text style={{ ...type.footnote, color: colors.tertiaryLabel }}>{hint}</Text> : null}
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

      <RecommendationReasonList reasons={reasons} />

      {/* Warm quote box — soft-accent surface, gold quotation mark. */}
      {quote ? (
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
          <Text style={{ flex: 1, ...type.callout, color: colors.secondaryLabel, fontStyle: 'italic' }}>{quote}</Text>
        </View>
      ) : null}

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
        <Text style={{ ...type.headline, color: colors.inverse }}>{t(wearLabelKey)}</Text>
      </Pressable>

      {/* Secondary text links: 查看详情 | 不喜欢 | 换一套 */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
        <Pressable accessibilityRole="button" onPress={onViewDetail} hitSlop={6}>
          <Text style={{ ...type.callout, color: colors.tertiaryLabel }}>{t('today.v2.viewDetail')}</Text>
        </Pressable>
        <Text style={{ ...type.callout, color: colors.separator, marginHorizontal: 12 }}>|</Text>
        <Pressable accessibilityRole="button" onPress={() => setShowFeedback((v) => !v)} hitSlop={6}>
          <Text style={{ ...type.callout, color: colors.tertiaryLabel }}>{t('today.v2.dislike')}</Text>
        </Pressable>
        {showSwap ? (
          <>
            <Text style={{ ...type.callout, color: colors.separator, marginHorizontal: 12 }}>|</Text>
            <Pressable accessibilityRole="button" disabled={swapBusy} onPress={onSwap} hitSlop={6}>
              <Text style={{ ...type.callout, color: swapBusy ? colors.quaternaryLabel : colors.tertiaryLabel }}>
                {t('today.v2.swap')}
              </Text>
            </Pressable>
          </>
        ) : null}
      </View>

      {showFeedback ? (
        <View style={{ borderTopWidth: 1, borderTopColor: colors.separatorSoft, paddingTop: 14 }}>
          <RecommendationFeedback outfitId={outfit.id} temperatureC={temperatureC} />
        </View>
      ) : null}
    </View>
  );
}
