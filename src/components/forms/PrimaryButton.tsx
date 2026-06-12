import { ActivityIndicator, Pressable, Text } from 'react-native';

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
      className={`h-12 items-center justify-center rounded-full ${
        isDisabled ? 'bg-brand-500/60' : 'bg-brand-600 active:bg-brand-700'
      }`}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text className="text-base font-semibold text-white">{label}</Text>
      )}
    </Pressable>
  );
}
