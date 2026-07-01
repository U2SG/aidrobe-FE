import { ScrollView, Text, View } from 'react-native';

import { SystemIcon } from '@/components/ui/SystemIcon';
import { useT } from '@/hooks/useT';
import { colors, radius, type } from '@/theme/design';

// "衣然记住的关于你" (brief v0.9 §10.3). There is no BE endpoint for learned
// preferences yet, so this shows an explicit, honest unavailable state — NOT
// fabricated memory entries. When the contract lands, replace the placeholder
// with reviewable entries carrying [这不准] / [删除] actions.
export function MemoryManagementScreen() {
  const { t } = useT();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 48, gap: 20 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ gap: 8 }}>
        <Text style={{ ...type.title1, color: colors.label }}>{t('privacy.memory.title')}</Text>
        <Text style={{ ...type.body, color: colors.tertiaryLabel }}>{t('privacy.memory.subtitle')}</Text>
      </View>

      <View
        style={{
          borderRadius: radius.lg,
          backgroundColor: colors.secondaryElevated,
          borderWidth: 1,
          borderColor: colors.separatorSoft,
          padding: 24,
          alignItems: 'center',
          gap: 10,
        }}
      >
        <SystemIcon name="sparkle" size={22} color={colors.quaternaryLabel} strokeWidth={1.8} />
        <Text style={{ ...type.callout, color: colors.tertiaryLabel, textAlign: 'center' }}>
          {t('privacy.memory.empty')}
        </Text>
      </View>
    </ScrollView>
  );
}
