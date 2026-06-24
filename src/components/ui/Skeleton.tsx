import { useEffect, useRef } from 'react';
import { Animated, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius } from '@/theme/design';

// Pulsing placeholder for loading content (item thumbnails, list rows). Uses the
// RN Animated driver (same gentle pulse as CutoutBadge) — no extra dependency.
interface Props {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

export function Skeleton({ width = '100%', height = 16, radius: corner = radius.sm, style }: Props) {
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View
      style={[{ width, height, borderRadius: corner, backgroundColor: colors.fill, opacity: pulse }, style]}
    />
  );
}
