import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, Text, View } from 'react-native';

import { deactivateAccount, requestDataExport } from '@/api/account';
import { clearAllData } from '@/api/profile';
import { refreshTodayRecommendation } from '@/api/recommendations';
import { getUserSettings, updateUserSettings } from '@/api/settings';
import { DepartureTimeSheet } from '@/components/settings/DepartureTimeSheet';
import { DeleteDataSheet } from '@/components/product/DeleteDataSheet';
import { OptionPickerSheet } from '@/components/ui/OptionPickerSheet';
import { SystemIcon } from '@/components/ui/SystemIcon';
import { useT } from '@/hooks/useT';
import type { I18nKey } from '@/i18n';
import {
  invalidateAfterChangeLanguage,
  invalidateAfterUpdateDepartureTime,
  invalidateAfterUpdateLocation,
} from '@/state/invalidation';
import { useAuthStore } from '@/store/auth';
import { useLocalePrefStore } from '@/store/localePref';
import { useOnboardingStore } from '@/store/onboarding';
import { useToastStore } from '@/store/toast';
import { colors, radius, shadow, type } from '@/theme/design';
import type { LocalePref } from '@/types/api';
import type { SettingsStackParamList } from '@/types/navigation';
import { isCoords } from '@/utils/location';

type Props = NativeStackScreenProps<SettingsStackParamList, 'ProfileV2'>;

// ── Section ─────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <Text
        style={{
          ...type.caption,
          color: colors.tertiaryLabel,
          textTransform: 'uppercase',
          letterSpacing: 0.6,
          paddingHorizontal: 4,
        }}
      >
        {title}
      </Text>
      <View
        style={{
          overflow: 'hidden',
          borderRadius: radius.lg,
          backgroundColor: colors.elevated,
          ...shadow.soft,
        }}
      >
        {children}
      </View>
    </View>
  );
}

// ── Row ─────────────────────────────────────────────────────────────────────
// Covers four variants:
//   plain    — label + chevron
//   withSub  — label + sub below + chevron
//   withValue— label + value on right + chevron
//   danger   — danger label, no chevron

interface RowProps {
  labelKey: I18nKey;
  subKey?: I18nKey;
  value?: string | null;
  onPress: () => void;
  danger?: boolean;
  last?: boolean;
  leadingIcon?: React.ReactNode;
}

function Row({ labelKey, subKey, value, onPress, danger, last, leadingIcon }: RowProps) {
  const { t } = useT();
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: colors.fill }}
      style={{ backgroundColor: colors.elevated }}
      accessibilityRole="button"
    >
      <View
        style={{
          minHeight: 56,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: last ? 0 : 1,
          borderBottomColor: colors.separatorSoft,
          gap: 12,
        }}
      >
        {leadingIcon ? (
          <View style={{ width: 28, alignItems: 'center', justifyContent: 'center' }}>
            {leadingIcon}
          </View>
        ) : null}
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ ...type.body, color: danger ? colors.danger : colors.label }}>
            {t(labelKey)}
          </Text>
          {subKey ? (
            <Text style={{ ...type.footnote, color: colors.tertiaryLabel }}>{t(subKey)}</Text>
          ) : null}
        </View>
        {value != null ? (
          <Text style={{ ...type.callout, color: colors.tertiaryLabel }}>{value}</Text>
        ) : null}
        {danger ? null : (
          <SystemIcon name="chevronRight" size={16} color={colors.quaternaryLabel} />
        )}
      </View>
    </Pressable>
  );
}

// ── Avatar ───────────────────────────────────────────────────────────────────
// No name is available from the auth store (tokens only). Use a person glyph.

function AvatarGlyph() {
  return (
    <View
      style={{
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.accentSoft,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <SystemIcon name="person" size={22} color={colors.accent} />
    </View>
  );
}

// ── Data-ownership hint ──────────────────────────────────────────────────────

function DataHintBanner({ text }: { text: string }) {
  return (
    <View
      style={{
        backgroundColor: colors.accentSoft,
        borderRadius: radius.md,
        paddingHorizontal: 16,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
      }}
    >
      <View style={{ paddingTop: 1 }}>
        <SystemIcon name="shield" size={16} color={colors.accent} />
      </View>
      <Text style={{ ...type.footnote, color: colors.quietText, flex: 1, lineHeight: 18 }}>
        {text}
      </Text>
    </View>
  );
}

// ── ProfileV2Screen ──────────────────────────────────────────────────────────

// Profile v2 as a trust surface (brief v0.9 §10). Structured to match the
// prototype top-to-bottom: Aidrobe与你, 日常设置, 隐私与数据.
//
// Data policy (§10.3 — no fabrication):
//   • Avatar: person glyph — no name available from auth store (tokens only).
//   • Name: omitted (no user profile API).
//   • 使用第N天 / 风格灵感 saved-count: omitted (no API).
//   • 出门时间 / 位置 / 语言: real values from getUserSettings(); each row opens
//     a focused editor sheet (no jump to the full V1 Settings screen).
//
// 风格灵感 pushes StyleInspirations, which is mounted in this Settings stack
// under V2 (no Discover tab exists in the V2 tab layout).
//
// Export row is kept under 隐私与数据 so the action remains reachable.
// SignOut is kept as a trailing row in 隐私与数据 so the user can always exit.
export function ProfileV2Screen({ navigation }: Props) {
  const { t } = useT();
  const showToast = useToastStore((s) => s.show);
  const clearAuth = useAuthStore((s) => s.clear);
  const setOnboardingCompleted = useOnboardingStore((s) => s.setCompleted);

  const settingsQuery = useQuery({
    queryKey: ['userSettings'],
    queryFn: getUserSettings,
    staleTime: 5 * 60 * 1000,
  });

  const settings = settingsQuery.data;

  const queryClient = useQueryClient();
  const langPref = useLocalePrefStore((s) => s.preference);
  const setLangPref = useLocalePrefStore((s) => s.setPreference);

  // 日常设置 rows edit ONE setting each via a focused sheet — no jump to the
  // full (V1) Settings screen. Mutations mirror SettingsScreen so today
  // regenerates and language/city stay in sync.
  const [departureOpen, setDepartureOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [deleteDataOpen, setDeleteDataOpen] = useState(false);

  const departureMutation = useMutation({
    mutationFn: (value: string) => updateUserSettings({ departureTime: `${value}:00` }),
    onSuccess: (data) => {
      queryClient.setQueryData(['userSettings'], data);
      invalidateAfterUpdateDepartureTime(queryClient);
      showToast({ message: t('settings.departureTimeSaved'), kind: 'success' });
      setDepartureOpen(false);
    },
    onError: () => showToast({ message: t('settings.departureTimeSaveFailed'), kind: 'error' }),
  });

  const languageMutation = useMutation({
    mutationFn: (locale: LocalePref) => updateUserSettings({ locale }),
    onSuccess: (data) => {
      queryClient.setQueryData(['userSettings'], data);
      invalidateAfterChangeLanguage(queryClient);
    },
    onError: () => showToast({ message: t('settings.language.saveFailed'), kind: 'error' }),
  });

  const selectLanguage = (locale: string) => {
    if (locale === langPref) return;
    setLangPref(locale as LocalePref);
    languageMutation.mutate(locale as LocalePref);
  };

  const locationMutation = useMutation({
    mutationFn: (value: string) => updateUserSettings({ location: value }),
    onSuccess: (data) => {
      queryClient.setQueryData(['userSettings'], data);
      // Regenerate today so city/weather follow the new location, then invalidate.
      void refreshTodayRecommendation()
        .catch(() => undefined)
        .finally(() => invalidateAfterUpdateLocation(queryClient));
      showToast({ message: t('settings.city.savedToast'), kind: 'success' });
      setLocationOpen(false);
    },
    onError: () => showToast({ message: t('settings.city.saveFailed'), kind: 'error' }),
  });

  // Clearing auth must also reset the onboarding flag so RootNavigator sends
  // the user back to sign-in/onboarding — parity with SettingsScreen.signOut.
  const resetToSignedOut = async () => {
    await clearAuth();
    setOnboardingCompleted(false);
  };

  const exportMutation = useMutation({
    mutationFn: requestDataExport,
    onSuccess: () => showToast({ message: t('profile.export.requested'), kind: 'success' }),
  });

  const deactivateMutation = useMutation({
    mutationFn: deactivateAccount,
    onSuccess: async () => {
      showToast({ message: t('profile.deactivate.done'), kind: 'success' });
      await resetToSignedOut();
    },
  });

  // BE#83 — clear ALL app data while KEEPING the account. Previously the
  // "账号会保留" DeleteDataSheet was mis-wired to deactivateAccount (no clear
  // endpoint existed); the sheet's promise and the action now match. Every
  // cached query is stale after the wipe, so drop the whole cache.
  const clearDataMutation = useMutation({
    mutationFn: clearAllData,
    onSuccess: () => {
      setDeleteDataOpen(false);
      queryClient.clear();
      showToast({ message: t('profile.clearData.done'), kind: 'success' });
    },
  });

  const confirmClearData = () => setDeleteDataOpen(true);

  // Deactivation (permanent, deletes the ACCOUNT) keeps its own explicit
  // confirm with the deactivation copy — never the keep-account sheet.
  const confirmDeactivate = () => {
    Alert.alert(t('profile.deactivate.title'), t('profile.deactivate.body'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('profile.deactivate.confirm'),
        style: 'destructive',
        onPress: () => deactivateMutation.mutate(),
      },
    ]);
  };

  const signOut = () => {
    void resetToSignedOut();
  };

  // StyleInspirations is mounted in this (Settings) stack under V2 — push it
  // directly. (Previously navigated to a DiscoverTab that does not exist in the
  // V2 tab layout, so the tap silently no-op'd.)
  const openInspirations = () => {
    navigation.navigate('StyleInspirations');
  };

  // Language label: derive display string from locale pref.
  const localeLabel = (() => {
    if (!settings) return null;
    if (settings.locale === 'zh-CN') return t('settings.language.zh-CN');
    if (settings.locale === 'en-US') return t('settings.language.en-US');
    if (settings.locale === 'system') return t('settings.language.system');
    return null;
  })();

  const notSet = t('common.notSet');

  const languageOptions = [
    { value: 'system', label: t('settings.language.system') },
    { value: 'zh-CN', label: t('settings.language.zh-CN') },
    { value: 'en-US', label: t('settings.language.en-US') },
  ];
  const currentLocale = langPref ?? settings?.locale ?? null;

  return (
    <>
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.groupedBackground }}
      contentContainerStyle={{
        paddingHorizontal: 20,
        paddingTop: 64,
        paddingBottom: 48,
        gap: 24,
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* Title */}
      <Text style={{ ...type.largeTitle, color: colors.label }}>{t('profile.title')}</Text>

      {/* Profile header row: avatar + no-name glyph (no user profile API) */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
          paddingHorizontal: 4,
        }}
      >
        <AvatarGlyph />
        {/* Name / usage line omitted — no API for either; no fabrication. */}
        <View style={{ flex: 1 }} />
      </View>

      {/* Section: Aidrobe 与你 */}
      <Section title={t('profile.section.aidrobe')}>
        <Row
          labelKey="profile.row.memory"
          subKey="profile.row.memory.sub"
          leadingIcon={<SystemIcon name="person" size={18} color={colors.accent} />}
          onPress={() => navigation.navigate('Memory')}
        />
        <Row
          labelKey="profile.row.inspirations"
          leadingIcon={<SystemIcon name="sparkle" size={18} color={colors.accent} />}
          onPress={openInspirations}
          last
        />
      </Section>

      {/* Data-ownership hint banner */}
      <DataHintBanner text={t('profile.hint.dataOwnership')} />

      {/* Section: 日常设置 */}
      <Section title={t('profile.section.daily')}>
        <Row
          labelKey="profile.row.departureTime"
          value={settings?.departureTime ?? notSet}
          leadingIcon={<SystemIcon name="clock" size={18} color={colors.tertiaryLabel} />}
          onPress={() => setDepartureOpen(true)}
        />
        <Row
          labelKey="profile.row.location"
          // Raw "lng,lat" coords mean GPS mode — show the mode label, not coords.
          value={
            settings?.location
              ? isCoords(settings.location)
                ? t('settings.city.gps')
                : settings.location
              : notSet
          }
          leadingIcon={<SystemIcon name="compass" size={18} color={colors.tertiaryLabel} />}
          onPress={() => setLocationOpen(true)}
        />
        <Row
          labelKey="profile.row.language"
          value={localeLabel ?? notSet}
          leadingIcon={<SystemIcon name="chart" size={18} color={colors.tertiaryLabel} />}
          onPress={() => setLanguageOpen(true)}
          last
        />
      </Section>

      {/* Section: 隐私与数据 */}
      <Section title={t('profile.section.privacy')}>
        <Row
          labelKey="profile.row.dataTrust"
          subKey="profile.row.dataTrust.sub"
          onPress={() => navigation.navigate('DataTrust')}
        />
        <Row
          labelKey="profile.row.permissions"
          onPress={() => void Linking.openSettings()}
        />
        <Row
          labelKey="profile.row.export"
          onPress={() => exportMutation.mutate()}
        />
        <Row
          labelKey="profile.row.signOut"
          onPress={signOut}
        />
        <Row
          labelKey="profile.row.clearData"
          onPress={confirmClearData}
          danger
        />
        <Row
          labelKey="profile.row.deactivate"
          onPress={confirmDeactivate}
          danger
          last
        />
      </Section>
    </ScrollView>

      <DepartureTimeSheet
        visible={departureOpen}
        initialValue={settings?.departureTime}
        saving={departureMutation.isPending}
        onSave={(value) => departureMutation.mutate(value)}
        onClose={() => setDepartureOpen(false)}
      />
      <OptionPickerSheet
        mode="single"
        visible={languageOpen}
        onClose={() => setLanguageOpen(false)}
        title={t('settings.language')}
        options={languageOptions}
        selected={currentLocale}
        onSelect={selectLanguage}
      />
      <OptionPickerSheet
        mode="single"
        visible={locationOpen}
        onClose={() => setLocationOpen(false)}
        title={t('profile.row.location')}
        options={[]}
        allowCustom
        // Surface the current city as the placeholder so the editor doesn't
        // open looking blank (the sheet's input intentionally starts empty).
        // Raw "lng,lat" coords are never shown — same guard as SettingsScreen.
        customPlaceholder={
          settings?.location && !isCoords(settings.location)
            ? settings.location
            : t('settings.city.manualPlaceholder')
        }
        selected={settings?.location ?? null}
        onSelect={(value) => locationMutation.mutate(value)}
      />
      <DeleteDataSheet
        visible={deleteDataOpen}
        loading={clearDataMutation.isPending}
        onConfirm={() => clearDataMutation.mutate()}
        onClose={() => setDeleteDataOpen(false)}
      />
    </>
  );
}
