import { View } from 'react-native';

// Web fallback for SiriBloomOrb. CanvasKit isn't loaded on web, so a live Skia
// canvas white-screens the bundle (see SiriOrb.web.tsx). Web isn't the primary
// target (native Android), so render the fully-bloomed ring statically — same
// footprint, no animation, no Skia.

export type BloomVariant = 'ink' | 'vivid';

const DOT_COUNT = 7;

export function SiriBloomOrb({
  size = 120,
  variant = 'vivid',
}: {
  size?: number;
  variant?: BloomVariant;
  /** Accepted for parity with the native orb; the web fallback is always static. */
  paused?: boolean;
}) {
  const center = size / 2;
  const ringR = size * 0.32;
  const dotR = size * 0.075;
  const vivid = variant === 'vivid';
  // three-stop analogous colours around the ring (blue→violet→pink), or grey.
  const palette = vivid
    ? ['#3B6BFA', '#5C4DF5', '#8F4DF5', '#B84DE8', '#E07AC0', '#8F4DF5', '#5C4DF5']
    : Array(DOT_COUNT).fill('#9FA0A3');

  return (
    <View style={{ width: size, height: size }}>
      {Array.from({ length: DOT_COUNT }, (_, i) => {
        const a = (i / DOT_COUNT) * Math.PI * 2;
        const cx = center + Math.cos(a) * ringR;
        const cy = center + Math.sin(a) * ringR;
        const color = palette[i % palette.length];
        return (
          <View key={i}>
            {/* soft halo */}
            <View
              style={{
                position: 'absolute',
                left: cx - dotR * 1.9,
                top: cy - dotR * 1.9,
                width: dotR * 3.8,
                height: dotR * 3.8,
                borderRadius: dotR * 1.9,
                backgroundColor: color,
                opacity: 0.28,
              }}
            />
            {/* solid core */}
            <View
              style={{
                position: 'absolute',
                left: cx - dotR,
                top: cy - dotR,
                width: dotR * 2,
                height: dotR * 2,
                borderRadius: dotR,
                backgroundColor: color,
              }}
            />
          </View>
        );
      })}
    </View>
  );
}
