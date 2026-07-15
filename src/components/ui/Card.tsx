import { type ReactNode } from 'react';
import { Pressable, type StyleProp, View, type ViewStyle } from 'react-native';

import { colors, radius, shadow } from '@/theme/design';

export type CardVariant = 'elevated' | 'tinted' | 'flat';

// The repeated `View` + `colors.elevated/secondaryElevated` + `radius` +
// `shadow.soft` pattern, consolidated. Pass `onPress` to make it pressable.
// Defaults reproduce the dominant inline card (elevated surface, lg radius,
// soft shadow, 16 padding) so migrations are value-preserving.
interface Props {
  children: ReactNode;
  variant?: CardVariant;
  padding?: number;
  radius?: number;
  bordered?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

const SURFACE: Record<CardVariant, string> = {
  elevated: colors.elevated,
  tinted: colors.secondaryElevated,
  flat: colors.elevated,
};

export function Card({
  children,
  variant = 'elevated',
  padding = 16,
  radius: cornerRadius = radius.lg,
  bordered = false,
  onPress,
  style,
}: Props) {
  const base: StyleProp<ViewStyle> = [
    {
      backgroundColor: SURFACE[variant],
      borderRadius: cornerRadius,
      padding,
    },
    variant !== 'flat' && shadow.soft,
    bordered && { borderWidth: 1, borderColor: colors.borderSubtle },
    style,
  ];
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        android_ripple={{ color: colors.fill }}
        style={base}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={base}>{children}</View>;
}
