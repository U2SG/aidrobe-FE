import { Pressable, Text } from 'react-native';

import { colors, radius, type } from '@/theme/design';

interface Props {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}

export function SecondaryButton({ label, onPress, disabled }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      android_ripple={disabled ? undefined : { color: colors.fill }}
      style={{
        minHeight: 50,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.separator,
        backgroundColor: colors.elevated,
        opacity: disabled ? 0.44 : 1,
      }}
    >
      <Text style={{ ...type.body, fontWeight: '600', color: colors.label }}>{label}</Text>
    </Pressable>
  );
}
