import { Text, View } from 'react-native';

import { PrimaryButton } from '@/components/forms/PrimaryButton';

interface Props {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

export function ErrorState({ title = '出错了', description = '请检查网络后重试', onRetry }: Props) {
  return (
    <View className="flex-1 items-center justify-center px-8 py-12">
      <Text className="text-lg font-semibold text-ink-900">{title}</Text>
      <Text className="mt-2 text-center text-sm text-ink-500">{description}</Text>
      {onRetry ? (
        <View className="mt-6 w-full max-w-xs">
          <PrimaryButton label="重试" onPress={onRetry} />
        </View>
      ) : null}
    </View>
  );
}
