import { Pressable, ScrollView, Text, View } from 'react-native';

import { SystemIcon } from '@/components/ui/SystemIcon';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { useT } from '@/hooks/useT';
import { colors, radius, spacing, type } from '@/theme/design';
import type { I18nKey } from '@/i18n';

export interface ContextualEntry {
  key: string;
  icon: string;
  labelKey: I18nKey;
  hintKey: I18nKey;
  onPress: () => void;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  entries: ContextualEntry[];
}

function EntryRow({ entry, onClose }: { entry: ContextualEntry; onClose: () => void }) {
  const { t } = useT();
  return (
    <Pressable
      onPress={() => {
        onClose();
        entry.onPress();
      }}
      accessibilityRole="button"
      android_ripple={{ color: colors.fill }}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: spacing.control,
        borderRadius: radius.md,
        minHeight: 44,
        opacity: pressed ? 0.68 : 1,
      })}
    >
      {/* Icon container */}
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: radius.sm,
          backgroundColor: colors.accentSoft,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 14,
          flexShrink: 0,
        }}
      >
        <SystemIcon name={entry.icon as Parameters<typeof SystemIcon>[0]['name']} size={18} color={colors.accent} strokeWidth={1.8} />
      </View>

      {/* Text */}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ ...type.body, color: colors.label, fontWeight: '600' }} numberOfLines={1}>
          {t(entry.labelKey)}
        </Text>
        <Text style={{ ...type.callout, color: colors.tertiaryLabel, marginTop: 2 }} numberOfLines={1}>
          {t(entry.hintKey)}
        </Text>
      </View>

      <SystemIcon name="chevronRight" size={16} color={colors.quaternaryLabel} strokeWidth={1.7} />
    </Pressable>
  );
}

export function ContextualEntrySheet({ visible, onClose, entries }: Props) {
  const { t } = useT();

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={t('contextualEntry.title')}
    >
      {/* Sub-hint */}
      <Text
        style={{
          ...type.callout,
          color: colors.tertiaryLabel,
          textAlign: 'center',
          marginTop: -10,
          marginBottom: 4,
        }}
      >
        {t('contextualEntry.subtitle')}
      </Text>

      {/* Entry rows */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ gap: 2 }}
        style={{ marginHorizontal: -4 }}
      >
        {entries.map((entry) => (
          <EntryRow key={entry.key} entry={entry} onClose={onClose} />
        ))}
      </ScrollView>

      {/* Cancel */}
      <Pressable
        onPress={onClose}
        accessibilityRole="button"
        style={({ pressed }) => ({
          alignItems: 'center',
          paddingVertical: 14,
          borderRadius: radius.md,
          minHeight: 44,
          opacity: pressed ? 0.65 : 1,
        })}
      >
        <Text style={{ ...type.body, color: colors.tertiaryLabel }}>
          {t('common.cancel')}
        </Text>
      </Pressable>
    </BottomSheet>
  );
}
