import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { sendOutfitFeedback } from '@/api/recommendations';
import { useT } from '@/hooks/useT';
import { REASON_TAG_KEYS } from '@/i18n/domainLabels';
import { useToastStore } from '@/store/toast';
import { colors, radius, type } from '@/theme/design';

import { reasonChipToFeedback, type FeedbackChip } from './feedbackChips';

// FE#72 — structured recommendation feedback. One tap on a chip submits a
// {feedback_type, reason_tags} event (stable enum keys, never localized labels).
// 'Love it' is a positive rating; each reason chip is a dislike with one reason.
// Submitting disables the row (no duplicate taps); a failure is non-blocking and
// the chips stay tappable to retry. Render only where an outfit_id exists.
//
// API_GAP (FE#72): (1) Ask answers carry no outfit_id/recommendation_id, so Ask
// recommendation feedback is not wirable to this endpoint without a BE change to
// AskResult (or an Ask-specific feedback route). (2) The BE feedback endpoint
// takes no `source_surface`, so the today/ask surface origin is not recorded.

interface Props {
  outfitId: string;
}

export function RecommendationFeedback({ outfitId }: Props) {
  const { t, tEnum } = useT();
  const showToast = useToastStore((s) => s.show);
  const [submittedChip, setSubmittedChip] = useState<FeedbackChip | null>(null);

  const mutation = useMutation({
    mutationFn: (chip: FeedbackChip) => sendOutfitFeedback(outfitId, reasonChipToFeedback(chip)),
    onSuccess: (_data, chip) => {
      setSubmittedChip(chip);
      showToast({ message: t('feedback.thanks'), kind: 'success' });
    },
    // On error: the apiClient interceptor already surfaces a global error toast,
    // so we don't add a second one. The mutation resets to idle (submittedChip
    // stays null), leaving the chips enabled so the user can simply tap to retry.
  });

  if (submittedChip) {
    return (
      <View style={{ paddingVertical: 8 }}>
        <Text style={{ ...type.footnote, color: colors.tertiaryLabel }}>{t('feedback.submitted')}</Text>
      </View>
    );
  }

  const chips: FeedbackChip[] = ['love', ...REASON_TAG_KEYS];
  return (
    <View style={{ gap: 10 }}>
      <Text style={{ ...type.footnote, fontWeight: '600', color: colors.label }}>
        {t('feedback.prompt')}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {chips.map((chip) => {
          const positive = chip === 'love';
          const label = positive ? t('feedback.loveIt') : tEnum('reasonTag', chip);
          const busy = mutation.isPending && mutation.variables === chip;
          return (
            <Pressable
              key={chip}
              accessibilityRole="button"
              disabled={mutation.isPending}
              onPress={() => mutation.mutate(chip)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                minHeight: 36,
                paddingHorizontal: 14,
                borderRadius: radius.pill,
                borderWidth: 1,
                borderColor: positive ? colors.accent : colors.separator,
                backgroundColor: positive ? colors.accentSoft : colors.elevated,
                // Dim the non-active chips while one submission is in flight.
                opacity: mutation.isPending && !busy ? 0.5 : 1,
              }}
            >
              <Text
                style={{
                  ...type.caption,
                  fontWeight: '600',
                  color: positive ? colors.accent : colors.label,
                }}
              >
                {label}
              </Text>
              {busy ? <ActivityIndicator size="small" color={colors.tertiaryLabel} /> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
