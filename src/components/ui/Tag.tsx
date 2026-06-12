import type { PropsWithChildren } from 'react';
import { Text, View, type ViewStyle } from 'react-native';

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
          borderRadius: 999,
          backgroundColor: dark ? '#1A1714' : '#F8F3E9',
        },
        style,
      ]}
    >
      <Text style={{ fontSize: 11, fontWeight: '500', color: dark ? '#fff' : '#3A332B' }}>
        {children}
      </Text>
    </View>
  );
}
