import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Text, View } from 'react-native';

import { PrimaryButton } from '@/components/forms/PrimaryButton';
import { SecondaryButton } from '@/components/forms/SecondaryButton';
import { ScreenContainer } from '@/components/layout/ScreenContainer';
import type { WardrobeStackParamList } from '@/types/navigation';

type Props = NativeStackScreenProps<WardrobeStackParamList, 'ImportFailure'>;

const REASON_LABEL: Record<Props['route']['params']['reason'], string> = {
  upload_failed: '图片上传失败',
  unsupported_format: '图片格式不支持',
  too_large: '图片超过 10MB',
  recognition_failed: '识别失败',
  network_error: '网络异常',
};

const REASON_HINT: Record<Props['route']['params']['reason'], string> = {
  upload_failed: '请检查网络后重试，或换一张图片。',
  unsupported_format: '请上传 JPEG / PNG / WebP 格式。',
  too_large: '请压缩或换一张更小的图片。',
  recognition_failed: '换一张更清晰、背景更简单的照片可能更容易识别。',
  network_error: '请检查网络连接后重试。',
};

export function ImportFailureScreen({ navigation, route }: Props) {
  const { reason } = route.params;
  return (
    <ScreenContainer>
      <View className="flex-1 justify-between py-16">
        <View className="items-center">
          <Text className="text-2xl font-bold text-ink-900">{REASON_LABEL[reason]}</Text>
          <Text className="mt-3 text-center text-sm text-ink-500">{REASON_HINT[reason]}</Text>
        </View>
        <View className="gap-3">
          <PrimaryButton label="重新选择图片" onPress={() => navigation.replace('AddItem')} />
          <SecondaryButton label="返回衣橱" onPress={() => navigation.popToTop()} />
        </View>
      </View>
    </ScreenContainer>
  );
}
