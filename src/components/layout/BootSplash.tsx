import { ActivityIndicator, View } from 'react-native';

export function BootSplash() {
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <ActivityIndicator size="large" color="#3f4ee0" />
    </View>
  );
}
