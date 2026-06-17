import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { getUserSettings, updateUserSettings } from '@/api/settings';
import { SecondaryButton } from '@/components/forms/SecondaryButton';
import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { SystemIcon } from '@/components/ui/SystemIcon';
import { useAuthStore } from '@/store/auth';
import { useOnboardingStore } from '@/store/onboarding';
import { useToastStore } from '@/store/toast';
import { colors, radius, shadow, type } from '@/theme/design';
import type { SettingsStackParamList } from '@/types/navigation';

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

  const [location, setLocation] = useState('');
  const [locating, setLocating] = useState(false);
  const savedLocation = settingsQuery.data?.location ?? '';
  useEffect(() => {
    setLocation(savedLocation);
  }, [savedLocation]);

  const locationMutation = useMutation({
    mutationFn: (value: string) => updateUserSettings({ location: value }),
    onSuccess: (data) => {
      queryClient.setQueryData(['userSettings'], data);
    },
    onError: () => {
      showToast({ message: '保存失败，请稍后重试', kind: 'error' });
    },
  });

  const locationDirty = location.trim() !== savedLocation;
  const locationBusy = locating || locationMutation.isPending;

  const saveManualLocation = () => {
    locationMutation.mutate(location.trim(), {
      onSuccess: () => showToast({ message: '所在城市已保存', kind: 'success' }),
    });
  };

  const useCurrentLocation = async () => {
    if (locationBusy) return;
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showToast({ message: '定位权限被拒，可手动输入城市', kind: 'error' });
        return;
      }
      const { coords } = await Location.getCurrentPositionAsync({});
      // 和风天气要求经度在前、纬度在后，各保留两位小数
      const value = `${coords.longitude.toFixed(2)},${coords.latitude.toFixed(2)}`;
      locationMutation.mutate(value, {
        onSuccess: () => showToast({ message: '已根据当前位置更新', kind: 'success' }),
      });
    } catch {
      showToast({ message: '定位失败，可手动输入城市', kind: 'error' });
    } finally {
      setLocating(false);
    }
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
              我们会据此获取天气，让今日推荐更贴合实际气温。推荐使用当前位置自动获取，也可手动填写城市。
            </Text>
            <Pressable
              onPress={useCurrentLocation}
              disabled={locationBusy}
              android_ripple={locationBusy ? undefined : { color: colors.fill }}
              style={{
                minHeight: 44,
                flexDirection: 'row',
                gap: 8,
                paddingHorizontal: 16,
                borderRadius: radius.md,
                backgroundColor: colors.label,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: locationBusy ? 0.42 : 1,
              }}
            >
              {locating ? <ActivityIndicator size="small" color={colors.inverse} /> : null}
              <Text style={{ ...type.callout, fontWeight: '600', color: colors.inverse }}>
                {locating ? '正在定位…' : '使用当前位置'}
              </Text>
            </Pressable>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <TextInput
                value={location}
                onChangeText={setLocation}
                placeholder="例如：杭州 / 上海浦东"
                placeholderTextColor={colors.quaternaryLabel}
                maxLength={120}
                returnKeyType="done"
                editable={!locationBusy}
                onSubmitEditing={() => {
                  if (locationDirty && !locationBusy) saveManualLocation();
                }}
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
              <Pressable
                onPress={saveManualLocation}
                disabled={!locationDirty || locationBusy}
                style={{
                  height: 44,
                  paddingHorizontal: 16,
                  borderRadius: radius.md,
                  backgroundColor: colors.fill,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: !locationDirty || locationBusy ? 0.42 : 1,
                }}
              >
                <Text style={{ ...type.callout, fontWeight: '600', color: colors.label }}>
                  保存
                </Text>
              </Pressable>
            </View>
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
