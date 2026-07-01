import { ScrollView, Text, View } from 'react-native';

import { useT } from '@/hooks/useT';
import type { I18nKey } from '@/i18n';
import { colors, radius, type } from '@/theme/design';

// "你的衣橱，只属于你" — the human-readable data statement (brief v0.9 §10.2,
// copy from docs/product/aidrobe-privacy-data-copy-v0.1.md §A). All strings come
// from the i18n registry; nothing is written inline here.
const GROUPS: { title: I18nKey; items: I18nKey[] }[] = [
  {
    title: 'privacy.statement.collect.title',
    items: [
      'privacy.statement.collect.clothes',
      'privacy.statement.collect.behavior',
      'privacy.statement.collect.inspiration',
      'privacy.statement.collect.location',
    ],
  },
  {
    title: 'privacy.statement.use.title',
    items: [
      'privacy.statement.use.recognize',
      'privacy.statement.use.daily_outfit',
      'privacy.statement.use.preference',
      'privacy.statement.use.resurface',
    ],
  },
  {
    title: 'privacy.statement.notDo.title',
    items: [
      'privacy.statement.notDo.no_training',
      'privacy.statement.notDo.no_share',
      'privacy.statement.notDo.no_ad_profiling',
    ],
  },
  {
    title: 'privacy.statement.control.title',
    items: [
      'privacy.statement.control.view',
      'privacy.statement.control.correct',
      'privacy.statement.control.delete_item',
      'privacy.statement.control.delete_all',
    ],
  },
];

export function DataTrustScreen() {
  const { t } = useT();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 64, paddingBottom: 48, gap: 24 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ gap: 10 }}>
        <Text style={{ ...type.title1, color: colors.label }}>{t('privacy.statement.title')}</Text>
        <Text style={{ ...type.body, color: colors.secondaryLabel }}>{t('privacy.statement.intro')}</Text>
      </View>

      {GROUPS.map((group) => (
        <View
          key={group.title}
          style={{
            gap: 10,
            borderRadius: radius.lg,
            backgroundColor: colors.secondaryElevated,
            borderWidth: 1,
            borderColor: colors.separatorSoft,
            padding: 16,
          }}
        >
          <Text style={{ ...type.headline, color: colors.label }}>{t(group.title)}</Text>
          {group.items.map((item) => (
            <View key={item} style={{ flexDirection: 'row', gap: 8 }}>
              <Text style={{ ...type.callout, color: colors.accent }}>·</Text>
              <Text style={{ flex: 1, ...type.callout, color: colors.secondaryLabel }}>{t(item)}</Text>
            </View>
          ))}
        </View>
      ))}

      <Text style={{ ...type.footnote, color: colors.tertiaryLabel }}>{t('privacy.statement.policyLink')}</Text>
    </ScrollView>
  );
}
