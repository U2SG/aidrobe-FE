import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation } from '@tanstack/react-query';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { deactivateAccount, requestDataExport } from '@/api/account';
import { SystemIcon } from '@/components/ui/SystemIcon';
import { useT } from '@/hooks/useT';
import type { I18nKey } from '@/i18n';
import { useAuthStore } from '@/store/auth';
import { useToastStore } from '@/store/toast';
import { colors, radius, shadow, type } from '@/theme/design';
import type { SettingsStackParamList } from '@/types/navigation';

type Props = NativeStackScreenProps<SettingsStackParamList, 'ProfileV2'>;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ ...type.caption, color: colors.tertiaryLabel, textTransform: 'uppercase', paddingHorizontal: 4 }}>
        {title}
      </Text>
      <View style={{ overflow: 'hidden', borderRadius: radius.lg, backgroundColor: colors.elevated, ...shadow.soft }}>
        {children}
      </View>
    </View>
  );
}

function Row({
  labelKey,
  onPress,
  danger,
  last,
}: {
  labelKey: I18nKey;
  onPress: () => void;
  danger?: boolean;
  last?: boolean;
}) {
  const { t } = useT();
  return (
    <Pressable onPress={onPress} android_ripple={{ color: colors.fill }} style={{ backgroundColor: colors.elevated }}>
      <View
        style={{
          minHeight: 56,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: last ? 0 : 1,
          borderBottomColor: colors.separatorSoft,
        }}
      >
        <Text style={{ ...type.body, color: danger ? colors.danger : colors.label }}>{t(labelKey)}</Text>
        {danger ? null : <SystemIcon name="chevronRight" size={16} color={colors.quaternaryLabel} />}
      </View>
    </Pressable>
  );
}

// Profile v2 as a trust surface (brief v0.9 §10), not just settings. Groups the
// data/privacy/memory entries, links to the existing Settings screen for
// language/departure, and keeps delete / clear / deactivate clearly separated.
export function ProfileV2Screen({ navigation }: Props) {
  const { t } = useT();
  const showToast = useToastStore((s) => s.show);
  const clearAuth = useAuthStore((s) => s.clear);

  const exportMutation = useMutation({
    mutationFn: requestDataExport,
    onSuccess: () => showToast({ message: t('profile.export.requested'), kind: 'success' }),
  });
  const deactivateMutation = useMutation({
    mutationFn: deactivateAccount,
    onSuccess: async () => {
      showToast({ message: t('profile.deactivate.done'), kind: 'success' });
      await clearAuth();
    },
  });

  // Clear-all-data has no BE endpoint yet — be honest, never pretend it worked.
  const confirmClear = () =>
    Alert.alert(t('profile.clearData.title'), t('profile.clearData.unavailable'), [{ text: t('common.gotIt') }]);

  const confirmDeactivate = () =>
    Alert.alert(t('profile.deactivate.title'), t('profile.deactivate.body'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('profile.deactivate.confirm'), style: 'destructive', onPress: () => deactivateMutation.mutate() },
    ]);

  const signOut = () => {
    void clearAuth();
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.groupedBackground }}
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 64, paddingBottom: 48, gap: 24 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ gap: 4 }}>
        <Text style={{ ...type.title1, color: colors.label }}>{t('profile.title')}</Text>
        <Text style={{ ...type.callout, color: colors.tertiaryLabel }}>{t('profile.subtitle')}</Text>
      </View>

      <Section title={t('profile.section.data')}>
        <Row labelKey="profile.row.dataTrust" onPress={() => navigation.navigate('DataTrust')} />
        <Row labelKey="profile.row.memory" onPress={() => navigation.navigate('Memory')} last />
      </Section>

      <Section title={t('profile.section.preferences')}>
        <Row labelKey="profile.row.settings" onPress={() => navigation.navigate('Settings')} last />
      </Section>

      <Section title={t('profile.section.account')}>
        <Row labelKey="profile.row.export" onPress={() => exportMutation.mutate()} />
        <Row labelKey="profile.row.signOut" onPress={signOut} last />
      </Section>

      {/* Danger zone — clear / deactivate are visually + semantically separate. */}
      <Section title={t('profile.section.danger')}>
        <Row labelKey="profile.row.clearData" onPress={confirmClear} danger />
        <Row labelKey="profile.row.deactivate" onPress={confirmDeactivate} danger last />
      </Section>
    </ScrollView>
  );
}
