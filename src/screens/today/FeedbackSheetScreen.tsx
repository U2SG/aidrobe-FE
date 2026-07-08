import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { sendOutfitFeedback } from '@/api/recommendations';
import { SystemIcon } from '@/components/ui/SystemIcon';
import { useT } from '@/hooks/useT';
import { useTrack } from '@/hooks/useTrack';
import { REASON_TAG_KEYS, type ReasonTagKey } from '@/i18n/domainLabels';
import { useToastStore } from '@/store/toast';
import { colors, radius, shadow, type } from '@/theme/design';
import type { TodayStackParamList } from '@/types/navigation';

// FeedbackSheetScreen v2 restyle — pixel-fidelity pass matching the
// aidrobe-v2-08-feedback-sheet prototype.
//
// Interaction model (matches prototype):
//   • Single-select reason grid (2 columns) from REASON_TAG_KEYS
//   • Optional free-text note field (≤ 100 chars)
//   • Two actions: "提交并换一套" / "只提交反馈"
//     Both submit then navigation.goBack(). Swap is a UX signal only —
//     API_GAP[FE#73-swap]: FeedbackSheet has no callback channel to trigger
//     a wardrobe swap from within a modal child; the parent (OutfitDetail)
//     would need a route-param callback or a Zustand signal. For now both
//     CTAs submit + goBack(), preserving the existing flow.
//
// Note field is UI-only — API_GAP[BE#69-feedback-note]: the feedback endpoint
// does not accept a free-text field; notes are not sent to the server.
//
// Existing submit logic reused: sendOutfitFeedback (single-event endpoint),
// track, showToast, navigation.goBack().

type Props = NativeStackScreenProps<TodayStackParamList, 'FeedbackSheet'>;

// Icon per reason tag — mapped from SystemIcon's available set.
const REASON_ICON: Record<ReasonTagKey, 'shield' | 'person' | 'sparkle' | 'bag' | 'clock' | 'slider' | 'refresh' | 'compass'> = {
  too_formal: 'shield',
  too_casual: 'person',
  too_warm: 'sparkle',
  too_cold: 'refresh',
  wrong_color: 'bag',
  wrong_fit: 'slider',
  not_my_style: 'compass',
  just_worn: 'clock',
};

const T = {
  sheet: colors.elevated,
  ink: colors.label,
  ink2: colors.secondaryLabel,
  ink3: colors.tertiaryLabel,
  divider: colors.separator,
  fill: colors.fill,
  accentBg: colors.accentSoft,
  accent: colors.accent,
  bg: colors.groupedBackground,
};

const MAX_NOTE_CHARS = 100;

export function FeedbackSheetScreen({ navigation, route }: Props) {
  const { outfitId } = route.params;
  const isLocal = outfitId === 'local-showcase';
  const { t, tEnum } = useT();
  const showToast = useToastStore((state) => state.show);
  const track = useTrack();

  const [selectedReason, setSelectedReason] = useState<ReasonTagKey | null>(null);
  const [note, setNote] = useState('');

  const mutation = useMutation({
    mutationFn: (reason: ReasonTagKey) =>
      isLocal
        ? Promise.resolve({ success: true })
        : sendOutfitFeedback(outfitId, { kind: 'dislike', reasonTags: [reason] }),
    onSuccess: (_data, reason) => {
      track('outfit_feedback_sent', { outfitId, kind: 'dislike', reasonTags: [reason] });
      showToast({ message: t('feedback.thanks'), kind: 'success' });
      navigation.goBack();
    },
    // On error: apiClient interceptor already shows a toast; keep user on screen to retry.
  });

  const submit = () => {
    if (!selectedReason) {
      showToast({ message: t('feedback.sheet.errorNoReason'), kind: 'error' });
      return;
    }
    mutation.mutate(selectedReason);
  };

  const reasons = REASON_TAG_KEYS as unknown as ReasonTagKey[];

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      {/* Drag handle */}
      <View style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 4 }}>
        <View
          style={{
            width: 36,
            height: 4,
            borderRadius: radius.pill,
            backgroundColor: T.divider,
          }}
        />
      </View>

      {/* Close button row */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'flex-end',
          paddingHorizontal: 20,
          paddingBottom: 4,
        }}
      >
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t('common.cancel')}
          style={{ padding: 4 }}
        >
          <SystemIcon name="x" size={20} color={T.ink3} />
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <Text
          style={{
            ...type.title2,
            color: T.ink,
            marginBottom: 6,
          }}
        >
          {t('feedback.sheet.title')}
        </Text>
        <Text
          style={{
            ...type.footnote,
            color: T.ink3,
            marginBottom: 22,
            lineHeight: 19,
          }}
        >
          {t('feedback.sheet.subtitle')}
        </Text>

        {/* 2-column reason card grid */}
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 10,
            marginBottom: 22,
          }}
        >
          {reasons.map((key) => {
            const selected = selectedReason === key;
            const iconName = REASON_ICON[key];
            return (
              <Pressable
                key={key}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => setSelectedReason(selected ? null : key)}
                style={{
                  width: '47%',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  paddingVertical: 14,
                  paddingHorizontal: 14,
                  borderRadius: radius.sm,
                  backgroundColor: selected ? T.ink : T.sheet,
                  borderWidth: selected ? 0 : 1,
                  borderColor: T.divider,
                  minHeight: 52,
                  ...shadow.soft,
                }}
              >
                <SystemIcon
                  name={iconName}
                  size={18}
                  color={selected ? colors.inverse : T.ink2}
                  strokeWidth={1.6}
                />
                <Text
                  style={{
                    ...type.footnote,
                    fontWeight: '500',
                    color: selected ? colors.inverse : T.ink,
                    flexShrink: 1,
                  }}
                  numberOfLines={2}
                >
                  {tEnum('reasonTag', key)}
                </Text>
                {selected ? (
                  <View style={{ marginLeft: 'auto' }}>
                    <SystemIcon name="check" size={14} color={colors.inverse} strokeWidth={2.2} />
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>

        {/* Optional free-text note */}
        {/* API_GAP[BE#69-feedback-note]: note is captured locally but not sent — no server field. */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 8,
            marginBottom: 4,
          }}
        >
          <SystemIcon name="link" size={16} color={T.ink3} strokeWidth={1.6} />
          <TextInput
            style={{
              flex: 1,
              ...type.callout,
              color: T.ink,
              minHeight: 36,
            }}
            placeholder={t('feedback.sheet.freeTextPlaceholder')}
            placeholderTextColor={T.ink3}
            maxLength={MAX_NOTE_CHARS}
            multiline
            value={note}
            onChangeText={setNote}
          />
        </View>
        <Text
          style={{
            ...type.caption,
            color: T.ink3,
            textAlign: 'right',
            marginBottom: 2,
          }}
        >
          {note.length}/{MAX_NOTE_CHARS}
        </Text>
      </ScrollView>

      {/* Bottom action bar */}
      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 12,
          paddingBottom: 36,
          backgroundColor: T.bg,
          gap: 10,
        }}
      >
        {/* Primary CTA — submit + swap (API_GAP: swap signal not implemented; same as submit-only) */}
        <Pressable
          onPress={submit}
          disabled={mutation.isPending}
          accessibilityRole="button"
          style={{
            height: 54,
            borderRadius: radius.md,
            backgroundColor: T.ink,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: mutation.isPending ? 0.7 : 1,
          }}
        >
          <Text
            style={{
              ...type.callout,
              fontWeight: '700',
              color: colors.inverse,
              letterSpacing: 0.2,
            }}
          >
            {t('feedback.sheet.submitSwap')}
          </Text>
        </Pressable>

        {/* Secondary CTA — submit only */}
        <Pressable
          onPress={submit}
          disabled={mutation.isPending}
          accessibilityRole="button"
          style={{
            height: 44,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: mutation.isPending ? 0.5 : 1,
          }}
        >
          <Text
            style={{
              ...type.callout,
              color: T.ink2,
            }}
          >
            {t('feedback.sheet.submitOnly')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
