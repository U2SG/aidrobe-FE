import { type ReactNode } from 'react';
import { Modal as RNModal, Pressable, View } from 'react-native';

import { colors, radius, shadow } from '@/theme/design';

import { Typography } from './Typography';

// Slide-up bottom sheet with a light scrim. Extracted from DepartureTimeSheet
// so every sheet shares one scrim/positioning/safe-padding shell; callers pass
// the content (and their own action row).
interface Props {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export function BottomSheet({ visible, onClose, title, children }: Props) {
  return (
    <RNModal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable
          accessibilityLabel="close"
          onPress={onClose}
          style={{ flex: 1, backgroundColor: 'rgba(20,16,12,0.25)' }}
        />
        <View
          style={{
            backgroundColor: colors.elevated,
            borderTopLeftRadius: radius.lg,
            borderTopRightRadius: radius.lg,
            paddingHorizontal: 24,
            paddingTop: 14,
            paddingBottom: 32,
            gap: 18,
            ...shadow.elevated,
          }}
        >
          {title ? (
            <Typography variant="headline" align="center">
              {title}
            </Typography>
          ) : null}
          {children}
        </View>
      </View>
    </RNModal>
  );
}
