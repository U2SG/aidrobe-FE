import { ActivityIndicator, Text, View } from 'react-native';

export function LoadingBlock({ label }: { label?: string }) {
  return (
    <View className="items-center justify-center py-12">
      <ActivityIndicator color="#3f4ee0" />
      {label ? <Text className="mt-3 text-sm text-ink-500">{label}</Text> : null}
    </View>
  );
}
