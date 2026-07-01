import { Pressable, Text, View } from 'react-native';

import { useT } from '@/hooks/useT';
import { colors, radius, type } from '@/theme/design';

// A low-key, non-blocking passive-learning nudge — "did you end up wearing X?"
// Presentational only: the caller decides whether to render it (enforcing the
// frequency caps in src/state/promptFrequency via the store) and records the
// shown/answered/ignored outcome. Never blocks the main Today surface.
export function PassiveWearPrompt({
  itemName,
  onAnswer,
  onDismiss,
}: {
  itemName: string;
  onAnswer: (wore: boolean) => void;
  onDismiss: () => void;
}) {
  const { t } = useT();

  return (
    <View
      style={{
        borderRadius: radius.lg,
        backgroundColor: colors.groupedBackground,
        borderWidth: 1,
        borderColor: colors.separatorSoft,
        padding: 14,
        gap: 12,
      }}
    >
      <Text style={{ ...type.callout, color: colors.secondaryLabel }}>
        {t('passiveWear.prompt', { item: itemName })}
      </Text>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Pressable
          accessibilityRole="button"
          onPress={() => onAnswer(true)}
          style={{ flex: 1, height: 40, borderRadius: radius.pill, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ ...type.caption, fontWeight: '700', color: colors.accent }}>{t('passiveWear.wore')}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => onAnswer(false)}
          style={{ flex: 1, height: 40, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.separator, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ ...type.caption, fontWeight: '600', color: colors.label }}>{t('passiveWear.didnt')}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('passiveWear.dismiss')}
          onPress={onDismiss}
          style={{ width: 40, height: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ ...type.caption, color: colors.tertiaryLabel }}>{t('passiveWear.later')}</Text>
        </Pressable>
      </View>
    </View>
  );
}
