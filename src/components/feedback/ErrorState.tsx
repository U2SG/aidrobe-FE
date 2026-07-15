import { Text, View } from 'react-native';

import { PrimaryButton } from '@/components/forms/PrimaryButton';
import { useT } from '@/hooks/useT';
import { colors, type } from '@/theme/design';

interface Props {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

export function ErrorState({ title, description, onRetry }: Props) {
  const { t } = useT();
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
      <Text style={{ ...type.headline, color: colors.label, textAlign: 'center' }}>
        {title ?? t('common.errorTitle')}
      </Text>
      <Text
        style={{
          ...type.callout,
          marginTop: 8,
          color: colors.tertiaryLabel,
          textAlign: 'center',
        }}
      >
        {description ?? t('common.errorDescription')}
      </Text>
      {onRetry ? (
        <View style={{ marginTop: 24, width: '100%', maxWidth: 320 }}>
          <PrimaryButton label={t('common.retry')} onPress={onRetry} />
        </View>
      ) : null}
    </View>
  );
}
