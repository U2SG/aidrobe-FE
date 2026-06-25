import { type ReactNode } from 'react';
import { type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';

import { colors, radius } from '@/theme/design';

// Dependency-free "gradient" surface: a tinted base with a soft top highlight,
// giving the editorial high-light-edge look without a gradient library. Swap
// the overlay for expo-linear-gradient later without changing this API.
interface Props {
  children?: ReactNode;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

export function GradientSurface({ children, radius: corner = radius.lg, style }: Props) {
  return (
    <View
      style={[
        { borderRadius: corner, backgroundColor: colors.secondaryElevated, overflow: 'hidden' },
        style,
      ]}
    >
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { bottom: '55%', backgroundColor: 'rgba(255,255,255,0.45)' }]}
      />
      {children}
    </View>
  );
}
