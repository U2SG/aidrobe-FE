import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { getUserSettings, updateUserSettings } from '@/api/settings';
import { OperationBanner } from '@/components/feedback/OperationBanner';
import { SecondaryButton } from '@/components/forms/SecondaryButton';
import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { Button } from '@/components/ui/Button';
import { SystemIcon } from '@/components/ui/SystemIcon';
import { useT } from '@/hooks/useT';
import {
  invalidateAfterChangeLanguage,
  invalidateAfterUpdateLocation,
} from '@/state/invalidation';
import { phaseFromFlags } from '@/state/operationState';
import { useAuthStore } from '@/store/auth';
import { useLocalePrefStore } from '@/store/localePref';
import { useLocationPrefStore, type LocationMode } from '@/store/locationPref';
import { useOnboardingStore } from '@/store/onboarding';
import { useToastStore } from '@/store/toast';
import { colors, radius, shadow, type } from '@/theme/design';
import type { LocalePref } from '@/types/api';
import type { SettingsStackParamList } from '@/types/navigation';
import { coordsValue, isCoords, reverseGeocodeLabel } from '@/utils/location';

type Props = NativeStackScreenProps<SettingsStackParamList, 'Settings'>;

export function SettingsScreen({ navigation }: Props) {
  const { t } = useT();
  const showToast = useToastStore((state) => state.show);
  const clearAuth = useAuthStore((state) => state.clear);
  const setCompleted = useOnboardingStore((state) => state.setCompleted);
  const queryClient = useQueryClient();
  const settingsQuery = useQuery({
    queryKey: ['userSettings'],
    queryFn: getUserSettings,
  });

  const langPref = useLocalePrefStore((s) => s.preference);
  const setLangPref = useLocalePrefStore((s) => s.setPreference);
  // Server→local locale adoption runs app-wide at startup via useLocaleSync
  // (mounted in MainTabs), so every tab reflects the saved language on fresh
  // load — not just this screen.

  const languageMutation = useMutation({
    mutationFn: (locale: LocalePref) => updateUserSettings({ locale }),
    onSuccess: (data) => {
      queryClient.setQueryData(['userSettings'], data);
      invalidateAfterChangeLanguage(queryClient);
    },
    onError: () => {
      // Non-blocking: the local store already applied the switch; surface the
      // sync failure without reverting the user's choice.
      showToast({ message: t('settings.language.saveFailed'), kind: 'error' });
    },
  });

  const selectLanguage = (locale: LocalePref) => {
    if (locale === langPref) return;
    setLangPref(locale);
    languageMutation.mutate(locale);
  };

  const prefMode = useLocationPrefStore((s) => s.mode);
  const gpsLabel = useLocationPrefStore((s) => s.label);
  const setPrefMode = useLocationPrefStore((s) => s.setMode);
  const setGpsLabel = useLocationPrefStore((s) => s.setLabel);

  const savedLocation = settingsQuery.data?.location ?? '';
  // Infer the mode for users who set a location before this toggle existed:
  // a "lng,lat" string means they used GPS.
  const mode: LocationMode = prefMode ?? (isCoords(savedLocation) ? 'gps' : 'manual');

  const [manualText, setManualText] = useState('');
  const [locating, setLocating] = useState(false);
  // Remembers the last submitted location so the banner's retry can re-fire it
  // without the user re-typing or re-locating.
  const lastSubmittedRef = useRef<string | null>(null);
  useEffect(() => {
    // Never seed the input with raw coords — only a real city name.
    setManualText(isCoords(savedLocation) ? '' : savedLocation);
  }, [savedLocation]);

  const locationMutation = useMutation({
    mutationFn: (value: string) => updateUserSettings({ location: value }),
    onSuccess: (data) => {
      queryClient.setQueryData(['userSettings'], data);
      // update location → userSettings, todayRecommendation (see state/invalidation).
      // userSettings is set directly above; this refreshes today so weather
      // follows the new location.
      invalidateAfterUpdateLocation(queryClient);
    },
    onError: () => {
      // Inline OperationBanner now carries the error + retry; keep the toast as
      // a lightweight echo for users not looking at the banner.
      showToast({ message: t('settings.city.saveFailed'), kind: 'error' });
    },
  });

  const manualDirty = manualText.trim() !== (isCoords(savedLocation) ? '' : savedLocation);
  const locationBusy = locating || locationMutation.isPending;

  // Phase for the inline status banner. `locating` (GPS lookup) counts as
  // in-flight too, so the banner shows pending across the whole flow. Success is
  // owned by the toast (a one-shot), so the banner only carries pending + error
  // — otherwise React Query's sticky `isSuccess` would leave a green banner up
  // indefinitely, duplicating the toast.
  const locationPhase = phaseFromFlags({
    pending: locationBusy,
    failed: locationMutation.isError,
    busyPhase: locating ? 'processing' : 'saving',
  });

  const retryLocation = () => {
    const value = lastSubmittedRef.current;
    if (!value || locationBusy) return;
    locationMutation.mutate(value);
  };

  const saveManualLocation = () => {
    const value = manualText.trim();
    if (!value || locationBusy) return;
    setPrefMode('manual');
    setGpsLabel(null);
    lastSubmittedRef.current = value;
    locationMutation.mutate(value, {
      onSuccess: () => showToast({ message: t('settings.city.savedToast'), kind: 'success' }),
    });
  };

  const locateNow = async () => {
    if (locationBusy) return;
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showToast({ message: t('settings.city.permissionDenied'), kind: 'error' });
        return;
      }
      const { coords } = await Location.getCurrentPositionAsync({});
      const value = coordsValue(coords.longitude, coords.latitude);
      const label = await reverseGeocodeLabel(coords.longitude, coords.latitude);
      setPrefMode('gps');
      setGpsLabel(label);
      lastSubmittedRef.current = value;
      locationMutation.mutate(value, {
        onSuccess: () => showToast({ message: t('settings.city.updatedToast'), kind: 'success' }),
      });
    } catch {
      showToast({ message: t('settings.city.locateFailed'), kind: 'error' });
    } finally {
      setLocating(false);
    }
  };

  const selectGps = () => {
    if (locationBusy) return;
    setPrefMode('gps');
    // First time switching in (or no coords yet) → fetch right away.
    if (mode !== 'gps' || !isCoords(savedLocation)) void locateNow();
  };

  const selectManual = () => {
    if (locationBusy) return;
    setPrefMode('manual');
  };

  const signOut = async () => {
    await clearAuth();
    setCompleted(false);
  };

  const confirmClear = () => {
    Alert.alert(t('settings.clearWardrobe.title'), t('settings.clearWardrobe.body'), [
      { text: t('common.gotIt') },
    ]);
  };

  const LANGUAGE_OPTIONS: { key: LocalePref; label: string }[] = [
    { key: 'zh-CN', label: t('settings.language.zh-CN') },
    { key: 'en-US', label: t('settings.language.en-US') },
    { key: 'system', label: t('settings.language.system') },
  ];

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ paddingVertical: 16, gap: 22 }}>
        <View style={{ paddingHorizontal: 2 }}>
          <Text style={{ ...type.largeTitle, color: colors.label }}>{t('settings.title')}</Text>
          <Text style={{ ...type.callout, color: colors.tertiaryLabel, marginTop: 6 }}>
            {t('settings.subtitle')}
          </Text>
        </View>

        <Section title={t('settings.section.general')}>
          <Row
            label={t('settings.departureTime')}
            detail={
              settingsQuery.data?.departureTime
                ? settingsQuery.data.departureTime.slice(0, 5)
                : t('common.notSet')
            }
            onPress={() => navigation.navigate('DepartureTime')}
          />
          <View style={{ padding: 16, gap: 10 }}>
            <Text style={{ ...type.body, color: colors.label }}>{t('settings.language')}</Text>
            <View
              style={{
                flexDirection: 'row',
                backgroundColor: colors.groupedBackground,
                borderRadius: radius.md,
                padding: 4,
              }}
            >
              {LANGUAGE_OPTIONS.map((opt) => (
                <ModeTab
                  key={opt.key}
                  label={opt.label}
                  active={langPref === opt.key}
                  disabled={languageMutation.isPending}
                  onPress={() => selectLanguage(opt.key)}
                />
              ))}
            </View>
          </View>
        </Section>

        <Section title={t('settings.section.city')}>
          <View style={{ padding: 16, gap: 12 }}>
            <Text style={{ ...type.callout, color: colors.tertiaryLabel, lineHeight: 18 }}>
              {t('settings.city.hint')}
            </Text>

            <View
              style={{
                flexDirection: 'row',
                backgroundColor: colors.groupedBackground,
                borderRadius: radius.md,
                padding: 4,
              }}
            >
              <ModeTab label={t('settings.city.gps')} active={mode === 'gps'} disabled={locationBusy} onPress={selectGps} />
              <ModeTab label={t('settings.city.manual')} active={mode === 'manual'} disabled={locationBusy} onPress={selectManual} />
            </View>

            {mode === 'gps' ? (
              <Pressable
                onPress={locateNow}
                disabled={locationBusy}
                android_ripple={locationBusy ? undefined : { color: colors.fill }}
                style={{
                  minHeight: 48,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  paddingHorizontal: 14,
                  borderRadius: radius.md,
                  backgroundColor: colors.groupedBackground,
                  opacity: locationBusy ? 0.6 : 1,
                }}
              >
                {locating ? (
                  <ActivityIndicator size="small" color={colors.tertiaryLabel} />
                ) : (
                  <SystemIcon name="refresh" size={16} color={colors.secondaryLabel} />
                )}
                <Text style={{ ...type.body, color: colors.label, flex: 1 }} numberOfLines={1}>
                  {locating ? t('settings.city.locating') : (gpsLabel ?? t('settings.city.tapToLocate'))}
                </Text>
                <Text style={{ ...type.caption, color: colors.tertiaryLabel }}>
                  {locating ? '' : t('settings.city.relocate')}
                </Text>
              </Pressable>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <TextInput
                  value={manualText}
                  onChangeText={setManualText}
                  placeholder={t('settings.city.manualPlaceholder')}
                  placeholderTextColor={colors.quaternaryLabel}
                  maxLength={120}
                  returnKeyType="done"
                  editable={!locationBusy}
                  onSubmitEditing={saveManualLocation}
                  style={{
                    flex: 1,
                    minHeight: 44,
                    backgroundColor: colors.groupedBackground,
                    borderRadius: radius.md,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    ...type.body,
                    color: colors.label,
                  }}
                />
                <Button
                  variant="tonal"
                  size="sm"
                  label={t('common.save')}
                  onPress={saveManualLocation}
                  disabled={!manualDirty || locationBusy}
                  loading={locationMutation.isPending}
                  style={{ minHeight: 44 }}
                />
              </View>
            )}

            <OperationBanner
              phase={locationPhase}
              pendingText={locating ? t('settings.city.locating') : t('settings.city.saving')}
              successText={t('settings.city.saved')}
              errorText={t('settings.city.saveFailed')}
              onRetry={retryLocation}
            />
          </View>
        </Section>

        <Section title={t('settings.section.wardrobe')}>
          <Row
            label={t('settings.dataManagement')}
            detail={t('settings.dataManagement.detail')}
            onPress={confirmClear}
          />
          <Row
            label={t('settings.recSource')}
            detail={t('settings.recSource.detail')}
            onPress={() => showToast({ message: t('settings.recSource.toast'), kind: 'info' })}
          />
        </Section>

        <Section title={t('settings.section.privacy')}>
          <Row
            label={t('settings.photoUse')}
            detail={t('settings.photoUse.detail')}
            onPress={() => showToast({ message: t('settings.photoUse.toast'), kind: 'info' })}
          />
          <Row
            label={t('settings.version')}
            detail={Constants.expoConfig?.version ?? '0.1.0'}
            onPress={() => undefined}
            disabled
          />
        </Section>

        <View style={{ paddingTop: 2 }}>
          <SecondaryButton label={t('settings.signOut')} onPress={signOut} />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function ModeTab({
  label,
  active,
  disabled,
  onPress,
}: {
  label: string;
  active: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      style={{
        flex: 1,
        minHeight: 36,
        borderRadius: radius.sm,
        backgroundColor: active ? colors.elevated : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
        ...(active ? shadow.soft : {}),
      }}
    >
      <Text
        style={{
          ...type.callout,
          fontWeight: active ? '600' : '500',
          color: active ? colors.label : colors.tertiaryLabel,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View>
      <Text
        style={{
          ...type.caption,
          marginBottom: 8,
          paddingHorizontal: 4,
          color: colors.tertiaryLabel,
          textTransform: 'uppercase',
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

function Row({
  label,
  detail,
  onPress,
  disabled,
}: {
  label: string;
  detail?: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      android_ripple={disabled ? undefined : { color: colors.fill }}
      style={{
        backgroundColor: colors.elevated,
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <View
        style={{
          minHeight: 56,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: colors.separatorSoft,
        }}
      >
        <Text
          numberOfLines={1}
          style={{ ...type.body, color: colors.label, flexShrink: 0 }}
        >
          {label}
        </Text>
        <View
          style={{
            flex: 1,
            minWidth: 0,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 6,
          }}
        >
          {detail ? (
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              style={{
                ...type.callout,
                color: colors.tertiaryLabel,
                flexShrink: 1,
                textAlign: 'right',
              }}
            >
              {detail}
            </Text>
          ) : null}
          {!disabled ? (
            <SystemIcon name="chevronRight" size={14} color={colors.quaternaryLabel} />
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}
