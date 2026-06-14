import { ActivityIndicator, Text, View } from 'react-native';

import { colors, type } from '@/theme/design';

export function LoadingBlock({ label }: { label?: string }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 48 }}>
      <ActivityIndicator color={colors.accent} />
      {label ? (
        <Text style={{ ...type.callout, marginTop: 12, color: colors.tertiaryLabel }}>
          {label}
        </Text>
      ) : null}
    </View>
  );
}
