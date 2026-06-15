import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { SystemIcon } from '@/components/ui/SystemIcon';
import { colors, shadow, type } from '@/theme/design';

type IconName = Parameters<typeof SystemIcon>[0]['name'];

// Circular shadowed header button (back / close / action). The chrome repeated
// across every V4 screen.
export function HeaderIconButton({
  icon,
  onPress,
  size = 40,
  dark = false,
}: {
  icon: IconName;
  onPress: () => void;
  size?: number;
  dark?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: dark ? colors.label : colors.elevated,
        alignItems: 'center',
        justifyContent: 'center',
        ...shadow.soft,
      }}
    >
      <SystemIcon name={icon} size={Math.round(size * 0.45)} color={dark ? colors.inverse : colors.label} />
    </Pressable>
  );
}

// Standard pushed-screen header: 52px top inset, optional round back button,
// title, and an optional right-aligned slot (e.g. an action button).
export function ScreenHeader({
  title,
  onBack,
  right,
}: {
  title: string;
  onBack?: () => void;
  right?: ReactNode;
}) {
  return (
    <View
      style={{
        paddingTop: 52,
        paddingHorizontal: 16,
        paddingBottom: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
        {onBack ? <HeaderIconButton icon="chevronLeft" onPress={onBack} /> : null}
        <Text style={{ ...type.title2, color: colors.label }} numberOfLines={1}>
          {title}
        </Text>
      </View>
      {right}
    </View>
  );
}
