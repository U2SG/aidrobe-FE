import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { getUserSettings } from '@/api/settings';
import { SecondaryButton } from '@/components/forms/SecondaryButton';
import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { useAuthStore } from '@/store/auth';
import { useOnboardingStore } from '@/store/onboarding';
import { useToastStore } from '@/store/toast';
import type { SettingsStackParamList } from '@/types/navigation';

type Props = NativeStackScreenProps<SettingsStackParamList, 'Settings'>;

export function SettingsScreen({ navigation }: Props) {
  const showToast = useToastStore((state) => state.show);
  const clearAuth = useAuthStore((state) => state.clear);
  const setCompleted = useOnboardingStore((state) => state.setCompleted);
  const settingsQuery = useQuery({
    queryKey: ['userSettings'],
    queryFn: getUserSettings,
  });

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
      <ScrollView contentContainerStyle={{ paddingVertical: 12, gap: 18 }}>
        <View className="rounded-[28px] border border-closet-border bg-closet-panel p-5">
          <Text className="text-[30px] font-bold text-closet-ink">设置</Text>
          <Text className="mt-2 text-sm leading-5 text-closet-muted">
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

        <View className="pt-1">
          <SecondaryButton label="退出登录" onPress={signOut} />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View>
      <Text className="mb-2 px-2 text-xs font-medium text-closet-muted">{title}</Text>
      <View className="overflow-hidden rounded-[24px] border border-closet-border bg-closet-panel">
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
      className="flex-row items-center justify-between border-b border-closet-border px-4 py-4 last:border-b-0"
    >
      <Text className={`text-base ${disabled ? 'text-ink-300' : 'text-closet-ink'}`}>{label}</Text>
      {detail ? <Text className="text-sm text-closet-muted">{detail}</Text> : null}
    </Pressable>
  );
}
