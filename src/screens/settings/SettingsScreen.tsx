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
import { invalidateAfterUpdateLocation } from '@/state/invalidation';
import { phaseFromFlags } from '@/state/operationState';
import { useAuthStore } from '@/store/auth';
import { useLocationPrefStore, type LocationMode } from '@/store/locationPref';
import { useOnboardingStore } from '@/store/onboarding';
import { useToastStore } from '@/store/toast';
import { colors, radius, shadow, type } from '@/theme/design';
import type { SettingsStackParamList } from '@/types/navigation';
import { coordsValue, isCoords, reverseGeocodeLabel } from '@/utils/location';

type Props = NativeStackScreenProps<SettingsStackParamList, 'Settings'>;

export function SettingsScreen({ navigation }: Props) {
  const showToast = useToastStore((state) => state.show);
  const clearAuth = useAuthStore((state) => state.clear);
  const setCompleted = useOnboardingStore((state) => state.setCompleted);
  const queryClient = useQueryClient();
  const settingsQuery = useQuery({
    queryKey: ['userSettings'],
    queryFn: getUserSettings,
  });

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
      showToast({ message: '保存失败，请稍后重试', kind: 'error' });
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
      onSuccess: () => showToast({ message: '所在城市已保存', kind: 'success' }),
    });
  };

  const locateNow = async () => {
    if (locationBusy) return;
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showToast({ message: '定位权限被拒，可手动输入城市', kind: 'error' });
        return;
      }
      const { coords } = await Location.getCurrentPositionAsync({});
      const value = coordsValue(coords.longitude, coords.latitude);
      const label = await reverseGeocodeLabel(coords.longitude, coords.latitude);
      setPrefMode('gps');
      setGpsLabel(label);
      lastSubmittedRef.current = value;
      locationMutation.mutate(value, {
        onSuccess: () => showToast({ message: '已根据当前位置更新', kind: 'success' }),
      });
    } catch {
      showToast({ message: '定位失败，可手动输入城市', kind: 'error' });
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
    Alert.alert(
      '清空衣橱',
      '当前版本还没有批量清空接口。你可以在衣物详情里逐件删除，后续再放到数据管理页。',
      [{ text: '知道了' }],
    );
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ paddingVertical: 16, gap: 22 }}>
        <View style={{ paddingHorizontal: 2 }}>
          <Text style={{ ...type.largeTitle, color: colors.label }}>设置</Text>
          <Text style={{ ...type.callout, color: colors.tertiaryLabel, marginTop: 6 }}>
            Aidrobe 只保留 V1 Slim 必要设置：出门时间、数据说明和隐私信息。
          </Text>
        </View>

        <Section title="通用">
          <Row
            label="出门时间"
            detail={
              settingsQuery.data?.departureTime
                ? settingsQuery.data.departureTime.slice(0, 5)
                : '未设置'
            }
            onPress={() => navigation.navigate('DepartureTime')}
          />
        </Section>

        <Section title="所在城市">
          <View style={{ padding: 16, gap: 12 }}>
            <Text style={{ ...type.callout, color: colors.tertiaryLabel, lineHeight: 18 }}>
              我们会据此获取天气，让今日推荐更贴合实际气温。选「使用当前位置」后每次打开自动更新，也可改为手动填写城市。
            </Text>

            <View
              style={{
                flexDirection: 'row',
                backgroundColor: colors.groupedBackground,
                borderRadius: radius.md,
                padding: 4,
              }}
            >
              <ModeTab label="使用当前位置" active={mode === 'gps'} disabled={locationBusy} onPress={selectGps} />
              <ModeTab label="手动输入" active={mode === 'manual'} disabled={locationBusy} onPress={selectManual} />
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
                  {locating ? '正在定位…' : (gpsLabel ?? '点此获取当前位置')}
                </Text>
                <Text style={{ ...type.caption, color: colors.tertiaryLabel }}>
                  {locating ? '' : '重新定位'}
                </Text>
              </Pressable>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <TextInput
                  value={manualText}
                  onChangeText={setManualText}
                  placeholder="例如：杭州 / 上海浦东"
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
                  label="保存"
                  onPress={saveManualLocation}
                  disabled={!manualDirty || locationBusy}
                  loading={locationMutation.isPending}
                  style={{ minHeight: 44 }}
                />
              </View>
            )}

            <OperationBanner
              phase={locationPhase}
              pendingText={locating ? '正在定位…' : '正在保存所在城市…'}
              successText="所在城市已保存"
              errorText="保存失败，请重试"
              onRetry={retryLocation}
            />
          </View>
        </Section>

        <Section title="衣橱">
          <Row label="数据管理" detail="逐件维护" onPress={confirmClear} />
          <Row
            label="推荐来源"
            detail="仅使用你的衣橱"
            onPress={() =>
              showToast({ message: '今日推荐只会使用已录入且可穿的衣物。', kind: 'info' })
            }
          />
        </Section>

        <Section title="隐私">
          <Row
            label="照片用途"
            detail="识别与推荐"
            onPress={() =>
              showToast({ message: '衣物图片仅用于识别、保存和生成搭配推荐。', kind: 'info' })
            }
          />
          <Row
            label="版本"
            detail={Constants.expoConfig?.version ?? '0.1.0'}
            onPress={() => undefined}
            disabled
          />
        </Section>

        <View style={{ paddingTop: 2 }}>
          <SecondaryButton label="退出登录" onPress={signOut} />
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
