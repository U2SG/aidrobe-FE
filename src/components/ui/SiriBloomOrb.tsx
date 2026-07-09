import { Blur, Canvas, Circle, Group, useClock } from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';

// SiriBloomOrb — the house "AI presence" bloom. A ring of solid dots that
// (1) start fused as one big dot at the center, (2) split out to ring
// positions, then (3) rotate while each dot breathes. Each dot carries a
// blurred GPU halo (Skia) for the iOS-27-Siri glow; motion is driven by a
// UI-thread clock via Reanimated derived values, so it never touches the JS
// thread. Discrete dots (not a per-pixel fluid shader) — chosen because the
// motion is a handful of circles doing transforms, which declarative animation
// models far more cheaply than a fragment shader.
//
// `.web.tsx` sibling renders a static, Skia-free fallback (CanvasKit isn't
// loaded on web → a live Skia canvas white-screens the bundle).

export type BloomVariant = 'ink' | 'vivid';

const DOT_COUNT = 7;
const BLOOM_S = 0.7; // split-out duration
const ROT_SPEED = 0.55; // rad/s, starts only after the bloom completes
const BREATHE_SPEED = 2.3;
const PAUSED_T = 3.0; // frozen frame (reduce-motion): fully bloomed, mid-breathe

// vivid palette flows blue→violet→pink; ink stays metallic grey.
const VIVID = [
  [0.23, 0.42, 0.98],
  [0.56, 0.3, 0.96],
  [0.98, 0.48, 0.74],
] as const;
const INK = [0.62, 0.63, 0.66] as const;

function rgb(c: readonly number[], a: number): string {
  'worklet';
  return `rgba(${Math.round((c[0] ?? 0) * 255)}, ${Math.round((c[1] ?? 0) * 255)}, ${Math.round((c[2] ?? 0) * 255)}, ${a})`;
}

// Blue→violet→pink loop, offset per dot so color flows around the ring.
function vividAt(phase: number): number[] {
  'worklet';
  const p = ((phase % 1) + 1) % 1;
  const seg = p < 0.5 ? p * 2 : (p - 0.5) * 2;
  const from = p < 0.5 ? VIVID[0] : VIVID[1];
  const to = p < 0.5 ? VIVID[1] : VIVID[2];
  return [
    from[0] + (to[0] - from[0]) * seg,
    from[1] + (to[1] - from[1]) * seg,
    from[2] + (to[2] - from[2]) * seg,
  ];
}

function BloomDot({
  clock,
  index,
  center,
  ringR,
  dotR,
  bigR,
  vivid,
  paused,
}: {
  clock: SharedValue<number>;
  index: number;
  center: number;
  ringR: number;
  dotR: number;
  bigR: number;
  vivid: boolean;
  paused: boolean;
}) {
  const angle0 = (index / DOT_COUNT) * Math.PI * 2;

  const geom = useDerivedValue(() => {
    'worklet';
    const t = paused ? PAUSED_T : clock.value / 1000;
    const bloom = Math.min(t / BLOOM_S, 1);
    const spread = 1 - Math.pow(1 - bloom, 3); // easeOutCubic: center → ring
    const rot = Math.max(0, t - BLOOM_S) * ROT_SPEED; // rotate only after split
    const breathe = 1 + 0.16 * Math.sin(t * BREATHE_SPEED + index * 0.9);
    const a = angle0 + rot;
    const rad = spread * ringR;
    return {
      cx: center + Math.cos(a) * rad,
      cy: center + Math.sin(a) * rad,
      // fused big dot at the center (spread 0) → small dot on the ring (spread 1)
      r: (bigR + (dotR - bigR) * spread) * breathe,
    };
  });

  const cx = useDerivedValue(() => geom.value.cx);
  const cy = useDerivedValue(() => geom.value.cy);
  const coreR = useDerivedValue(() => geom.value.r);
  const haloR = useDerivedValue(() => geom.value.r * 2.3);

  const coreColor = useDerivedValue(() => {
    'worklet';
    if (!vivid) return rgb(INK, 0.95);
    const t = paused ? PAUSED_T : clock.value / 1000;
    return rgb(vividAt(index / DOT_COUNT + t * 0.12), 0.98);
  });
  const haloColor = useDerivedValue(() => {
    'worklet';
    if (!vivid) return rgb(INK, 0.28);
    const t = paused ? PAUSED_T : clock.value / 1000;
    return rgb(vividAt(index / DOT_COUNT + t * 0.12), 0.4);
  });

  return (
    <Group>
      {/* soft GPU glow */}
      <Circle cx={cx} cy={cy} r={haloR} color={haloColor}>
        <Blur blur={dotR * 0.9} />
      </Circle>
      {/* solid core */}
      <Circle cx={cx} cy={cy} r={coreR} color={coreColor} />
    </Group>
  );
}

export function SiriBloomOrb({
  size = 120,
  variant = 'vivid',
  paused = false,
}: {
  size?: number;
  variant?: BloomVariant;
  paused?: boolean;
}) {
  const clock = useClock();
  const center = size / 2;
  const ringR = size * 0.32; // ring radius (leaves halo margin inside the canvas)
  const dotR = size * 0.075; // ring-dot radius
  const bigR = size * 0.2; // fused center-dot radius before the split
  const vivid = variant === 'vivid';

  return (
    <Canvas style={{ width: size, height: size }}>
      {Array.from({ length: DOT_COUNT }, (_, i) => (
        <BloomDot
          key={i}
          clock={clock}
          index={i}
          center={center}
          ringR={ringR}
          dotR={dotR}
          bigR={bigR}
          vivid={vivid}
          paused={paused}
        />
      ))}
    </Canvas>
  );
}
