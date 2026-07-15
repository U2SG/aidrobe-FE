import { View, Text } from 'react-native';

import { SystemIcon } from '@/components/ui/SystemIcon';
import { useT } from '@/hooks/useT';
import type { I18nKey } from '@/i18n';
import { colors, radius, type } from '@/theme/design';
import type { RecommendationReason, RecommendationReasonSource } from '@/types/api';

// Today v2 reasons: 2–3 real reasons, each a warm-gold marker + text, with an
// optional provenance label on the right (weather / wardrobe history / …).
// Reasons come from the API (see buildRecommendationReasons) — never hardcoded.
// `source` is optional: when absent (BE returns plain text today) no label shows.

const SOURCE_LABEL_KEY: Record<RecommendationReasonSource, I18nKey> = {
  weather_rule: 'today.reasonSource.weather',
  wardrobe_history: 'today.reasonSource.history',
  preference_memory: 'today.reasonSource.preference',
  style_memory: 'today.reasonSource.style',
  indoor_climate_inference: 'today.reasonSource.indoorClimate',
  llm: 'today.reasonSource.llm',
};

export function RecommendationReasonList({ reasons }: { reasons: RecommendationReason[] }) {
  const { t } = useT();
  if (!reasons.length) return null;

  return (
    <View style={{ gap: 12 }}>
      {reasons.map((reason, index) => (
        <View
          key={index}
          style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}
        >
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: radius.pill,
              backgroundColor: colors.accentSoft,
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: 1,
            }}
          >
            <SystemIcon name="sparkle" size={12} color={colors.accent} strokeWidth={1.8} />
          </View>
          <Text style={{ flex: 1, ...type.callout, color: colors.secondaryLabel }}>{reason.text}</Text>
          {/* Provenance label on the right (design handoff), when the BE provides
              a source. Absent today → nothing rendered. */}
          {reason.source ? (
            <Text style={{ ...type.caption, color: colors.tertiaryLabel, marginTop: 2 }}>
              {t(SOURCE_LABEL_KEY[reason.source])}
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}
