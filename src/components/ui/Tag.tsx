import type { PropsWithChildren } from 'react';
import { Text, View, type ViewStyle } from 'react-native';

import { colors, radius, type } from '@/theme/design';

interface Props extends PropsWithChildren {
  dark?: boolean;
  style?: ViewStyle;
}

export function Tag({ children, dark, style }: Props) {
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          paddingHorizontal: 9,
          paddingVertical: 4,
          borderRadius: radius.pill,
          backgroundColor: dark ? colors.label : colors.accentSoft,
        },
        style,
      ]}
    >
      <Text style={{ ...type.caption, color: dark ? colors.inverse : colors.secondaryLabel }}>
        {children}
      </Text>
    </View>
  );
}
