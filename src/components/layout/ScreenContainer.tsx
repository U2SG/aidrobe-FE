import type { PropsWithChildren } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Props extends PropsWithChildren {
  /** 页面内边距，默认 16 */
  padded?: boolean;
}

export function ScreenContainer({ children, padded = true }: Props) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F5EFE6' }} edges={['top', 'left', 'right']}>
      <View style={[{ flex: 1 }, padded && { paddingHorizontal: 16 }]}>{children}</View>
    </SafeAreaView>
  );
}
