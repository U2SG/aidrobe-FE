import { ActivityIndicator, Pressable, Text } from 'react-native';

import { colors, radius, type } from '@/theme/design';

interface Props {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}

export function PrimaryButton({ label, onPress, loading, disabled }: Props) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      android_ripple={isDisabled ? undefined : { color: 'rgba(255,255,255,0.16)' }}
      style={{
        minHeight: 50,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: radius.md,
        backgroundColor: colors.label,
        opacity: isDisabled ? 0.42 : 1,
      }}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={{ ...type.body, fontWeight: '700', color: colors.inverse }}>{label}</Text>
      )}
    </Pressable>
  );
}
