import { Text, type TextProps, type TextStyle } from 'react-native';

import { colors, type } from '@/theme/design';

export type TypographyVariant = keyof typeof type;

// Token-driven Text. Kills the pervasive inline `<Text style={{ ...type.body,
// color: colors.label }}>` spread: pass `variant` + `color` (a design-token key
// like "label"/"tertiaryLabel"/"inverse", or a raw color string). Routes through
// the same `type` scale + palette as the rest of the system.
interface Props extends TextProps {
  variant?: TypographyVariant;
  // A design-token key ("label"/"tertiaryLabel"/"inverse"/...) or a raw color.
  color?: string;
  align?: TextStyle['textAlign'];
}

export function Typography({ variant = 'body', color = 'label', align, style, ...rest }: Props) {
  const resolved = (colors as Record<string, string>)[color] ?? color;
  return <Text {...rest} style={[type[variant], { color: resolved, textAlign: align }, style]} />;
}
