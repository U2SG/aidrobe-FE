import { Text, View } from 'react-native';

import { PrimaryButton } from '@/components/forms/PrimaryButton';
import { colors, type } from '@/theme/design';

interface Props {
  title: string;
  description?: string;
  ctaLabel?: string;
  onCtaPress?: () => void;
}

export function EmptyState({ title, description, ctaLabel, onCtaPress }: Props) {
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
      {description ? (
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
      ) : null}
      {ctaLabel && onCtaPress ? (
        <View style={{ marginTop: 24, width: '100%', maxWidth: 320 }}>
          <PrimaryButton label={ctaLabel} onPress={onCtaPress} />
        </View>
      ) : null}
    </View>
  );
}
