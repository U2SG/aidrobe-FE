import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { PrimaryButton } from '@/components/forms/PrimaryButton';
import { SecondaryButton } from '@/components/forms/SecondaryButton';
import { ScreenContainer } from '@/components/layout/ScreenContainer';
import type { OnboardingStackParamList } from '@/types/navigation';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Permission'>;

type PermissionStatus = 'undetermined' | 'granted' | 'denied';

function statusLabel(status: PermissionStatus) {
  switch (status) {
    case 'granted':
      return '已允许';
    case 'denied':
      return '已拒绝';
    default:
      return '未设置';
  }
}

function statusStyle(status: PermissionStatus) {
  if (status === 'granted') return 'bg-[#edf1e8] text-closet-sage';
  if (status === 'denied') return 'bg-closet-peach text-closet-ink';
  return 'bg-closet-cream text-closet-muted';
}

export function PermissionScreen({ navigation }: Props) {
  const [camera, setCamera] = useState<PermissionStatus>('undetermined');
  const [library, setLibrary] = useState<PermissionStatus>('undetermined');

  const refresh = useCallback(async () => {
    const cam = await ImagePicker.getCameraPermissionsAsync();
    const lib = await ImagePicker.getMediaLibraryPermissionsAsync();
    setCamera(cam.granted ? 'granted' : cam.canAskAgain ? 'undetermined' : 'denied');
    setLibrary(lib.granted ? 'granted' : lib.canAskAgain ? 'undetermined' : 'denied');
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const requestAll = async () => {
    await ImagePicker.requestCameraPermissionsAsync();
    await ImagePicker.requestMediaLibraryPermissionsAsync();
    await refresh();
  };

  return (
    <ScreenContainer>
      <View className="flex-1 justify-between py-10">
        <View>
          <Text className="text-[32px] font-bold leading-[40px] text-closet-ink">
            允许必要的权限
          </Text>
          <Text className="mt-3 text-base leading-6 text-closet-muted">
            添加衣物时需要相机或相册。Aidrobe 不会申请推送、定位或通讯录权限。
          </Text>

          <View className="mt-8 gap-4">
            <PermissionCard
              title="相机"
              description="用于拍摄衣物，收进你的私人衣橱。"
              status={camera}
            />
            <PermissionCard
              title="相册"
              description="用于选择已经拍好的衣物照片。"
              status={library}
            />
          </View>
        </View>

        <View className="gap-3">
          <PrimaryButton label="允许访问" onPress={requestAll} />
          <SecondaryButton label="暂时跳过" onPress={() => navigation.navigate('DepartureTime')} />
        </View>
      </View>
    </ScreenContainer>
  );
}

function PermissionCard({
  title,
  description,
  status,
}: {
  title: string;
  description: string;
  status: PermissionStatus;
}) {
  return (
    <View className="rounded-[26px] border border-closet-border bg-closet-panel p-5">
      <View className="flex-row items-center justify-between">
        <Text className="text-lg font-semibold text-closet-ink">{title}</Text>
        <Text className={`rounded-full px-3 py-1 text-xs font-medium ${statusStyle(status)}`}>
          {statusLabel(status)}
        </Text>
      </View>
      <Text className="mt-2 text-sm leading-5 text-closet-muted">{description}</Text>
    </View>
  );
}
