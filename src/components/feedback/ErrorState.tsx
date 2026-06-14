import { Text, View } from 'react-native';

import { PrimaryButton } from '@/components/forms/PrimaryButton';
import { colors, type } from '@/theme/design';

interface Props {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

export function ErrorState({ title = '出错了', description = '请检查网络后重试', onRetry }: Props) {
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
        paddingVertical: 48,
      }}
    >
      <Text style={{ ...type.headline, color: colors.label, textAlign: 'center' }}>{title}</Text>
      <Text
        style={{
          ...type.callout,
          marginTop: 8,
          color: colors.tertiaryLabel,
          textAlign: 'center',
        }}
      >
        {description}
      </Text>
      {onRetry ? (
        <View style={{ marginTop: 24, width: '100%', maxWidth: 320 }}>
          <PrimaryButton label="重试" onPress={onRetry} />
        </View>
      ) : null}
    </View>
  );
}
