import type { PropsWithChildren } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing } from '@/theme/design';

interface Props extends PropsWithChildren {
  /** 页面内边距，默认 20 */
  padded?: boolean;
}

export function ScreenContainer({ children, padded = true }: Props) {
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.groupedBackground }}
      edges={['top', 'left', 'right']}
    >
      <View style={[{ flex: 1 }, padded && { paddingHorizontal: spacing.screen }]}>
        {children}
      </View>
    </SafeAreaView>
  );
}
