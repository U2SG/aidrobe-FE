import { type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  type StyleProp,
  Text,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { guardForeground } from '@/theme/contrast';
import { colors, radius, type } from '@/theme/design';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'outline'
  | 'tonal'
  | 'destructive'
  | 'glass';

export type ButtonSize = 'md' | 'sm';

interface Props {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  // Optional leading icon node (e.g. <SystemIcon .../>). Color is the caller's
  // responsibility — pass the variant's foreground if it should match.
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

interface VariantStyle {
  background: string;
  foreground: string;
  borderColor?: string;
  borderWidth?: number;
  // disabled opacity differs slightly per variant to match the prior buttons.
  disabledOpacity: number;
  rippleColor: string;
  fontWeight: TextStyle['fontWeight'];
}

// Each variant declares its DESIRED foreground; Button routes every one through
// guardForeground at render time, so no variant — nor a future palette change —
// can emit white text on a light background. Brand colors pass through.
const VARIANTS: Record<ButtonVariant, VariantStyle> = {
  primary: {
    background: colors.label,
    foreground: colors.inverse,
    disabledOpacity: 0.42,
    rippleColor: 'rgba(255,255,255,0.16)',
    fontWeight: '700',
  },
  secondary: {
    background: colors.elevated,
    foreground: colors.label,
    borderColor: colors.separator,
    borderWidth: 1,
    disabledOpacity: 0.44,
    rippleColor: colors.fill,
    fontWeight: '600',
  },
  ghost: {
    background: 'transparent',
    foreground: colors.secondaryLabel,
    disabledOpacity: 0.44,
    rippleColor: colors.fill,
    fontWeight: '600',
  },
  // Transparent surface with a hairline border (the variant owns the border so
  // call sites don't re-pass borderWidth/borderColor).
  outline: {
    background: 'transparent',
    foreground: colors.secondaryLabel,
    borderColor: colors.separator,
    borderWidth: 1,
    disabledOpacity: 0.44,
    rippleColor: colors.fill,
    fontWeight: '600',
  },
  tonal: {
    background: colors.fill,
    foreground: colors.label,
    disabledOpacity: 0.42,
    rippleColor: colors.separator,
    fontWeight: '600',
  },
  destructive: {
    background: colors.dangerBg,
    foreground: colors.danger,
    disabledOpacity: 0.5,
    rippleColor: 'rgba(184,92,74,0.12)',
    fontWeight: '700',
  },
  // Translucent surface — no blur dependency. Kept dark-ink so it stays
  // readable over the app's light backgrounds.
  glass: {
    background: 'rgba(255,255,255,0.55)',
    foreground: colors.label,
    borderColor: 'rgba(255,255,255,0.7)',
    borderWidth: 1,
    disabledOpacity: 0.44,
    rippleColor: colors.fill,
    fontWeight: '600',
  },
};

const baseStyle = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    borderRadius: radius.md,
  },
});

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  style,
}: Props) {
  const v = VARIANTS[variant];
  const isDisabled = disabled || loading;
  const minHeight = size === 'sm' ? 40 : 50;
  const textStyle = size === 'sm' ? type.callout : type.body;
  const foreground = guardForeground(v.background, v.foreground);

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      android_ripple={isDisabled ? undefined : { color: v.rippleColor }}
      style={({ pressed }) => [
        baseStyle.root,
        {
          minHeight,
          backgroundColor: v.background,
          borderColor: v.borderColor,
          borderWidth: v.borderWidth ?? 0,
          opacity: isDisabled ? v.disabledOpacity : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={foreground} />
      ) : (
        <>
          {icon}
          <Text numberOfLines={1} style={{ ...textStyle, fontWeight: v.fontWeight, color: foreground }}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

export type { Props as ButtonProps };
