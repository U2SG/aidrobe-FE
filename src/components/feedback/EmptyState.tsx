import { Text, View } from 'react-native';

import { PrimaryButton } from '@/components/forms/PrimaryButton';

interface Props {
  title: string;
  description?: string;
  ctaLabel?: string;
  onCtaPress?: () => void;
}

export function EmptyState({ title, description, ctaLabel, onCtaPress }: Props) {
  return (
    <View className="flex-1 items-center justify-center px-8 py-12">
      <Text className="text-lg font-semibold text-ink-900">{title}</Text>
      {description ? (
        <Text className="mt-2 text-center text-sm text-ink-500">{description}</Text>
      ) : null}
      {ctaLabel && onCtaPress ? (
        <View className="mt-6 w-full max-w-xs">
          <PrimaryButton label={ctaLabel} onPress={onCtaPress} />
        </View>
      ) : null}
    </View>
  );
}
