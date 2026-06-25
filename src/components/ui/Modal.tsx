import { type ReactNode } from 'react';
import { Modal as RNModal, Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, shadow } from '@/theme/design';

// Centered dialog with a light scrim. Consolidates the ad-hoc
// `<Modal transparent>` + scrim + card wrappers (e.g. AddItemScreen's
// LinkImportModal). For a slide-up sheet use `BottomSheet`.
interface Props {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  dismissOnBackdrop?: boolean;
}

export function Modal({ visible, onClose, children, dismissOnBackdrop = true }: Props) {
  return (
    <RNModal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <Pressable
          accessibilityLabel="close"
          onPress={dismissOnBackdrop ? onClose : undefined}
          style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(20,16,12,0.25)' }]}
        />
        <View
          style={{
            width: '100%',
            maxWidth: 420,
            backgroundColor: colors.elevated,
            borderRadius: radius.xl,
            padding: 20,
            ...shadow.elevated,
          }}
        >
          {children}
        </View>
      </View>
    </RNModal>
  );
}
