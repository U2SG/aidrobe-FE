import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View, type ViewStyle } from 'react-native';

/**
 * Lightweight "精修中" corner badge shown on a wardrobe item while its product-shot
 * cutout is still being generated server-side (cutout_status === 'queued').
 * The card keeps showing the original photo underneath — this is a hint, not a
 * blocker: no spinner, no countdown. A gently pulsing dot signals work in flight.
 */
export function CutoutBadge({ style }: { style?: ViewStyle }) {
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 900, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View style={[styles.pill, style]} pointerEvents="none">
      <Animated.View style={[styles.dot, { opacity: pulse }]} />
      <Text style={styles.label}>精修中</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(26,23,20,0.78)',
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#E8C77E',
  },
  label: {
    fontSize: 10,
    color: '#fff',
    letterSpacing: 0.5,
  },
});
