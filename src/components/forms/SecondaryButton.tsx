import { Pressable, Text } from 'react-native';

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
      className={`h-12 items-center justify-center rounded-full border ${
        disabled
          ? 'border-closet-border bg-closet-panel'
          : 'border-closet-border bg-closet-panel active:bg-ink-100'
      }`}
    >
      <Text className={`text-base font-medium ${disabled ? 'text-ink-300' : 'text-closet-ink'}`}>
        {label}
      </Text>
    </Pressable>
  );
}
