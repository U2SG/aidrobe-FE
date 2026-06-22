import { useReducedMotion } from 'react-native-reanimated';

import { SiriOrb, type SiriOrbVariant } from './SiriOrb';

// AIOrb — the house "AI presence" element. A thin generalization over the
// Skia/web SiriOrb primitive that adds a richer semantic variant set, size
// presets, and a reduce-motion fallback, WITHOUT touching the shader or
// re-splitting the platform files. It delegates all rendering to SiriOrb (which
// Metro resolves to `.tsx` on native / `.web.tsx` on web automatically), so
// back-compat and the web white-screen guard are both preserved.
//
// The shader only knows two palettes (`u_vivid`: ink vs vivid). Rather than
// speculatively branching the shader for looks no surface shows yet, the richer
// variants map onto those two palettes today; extend the shader only when a
// real surface needs a distinct look.

export type AIOrbVariant =
  | 'ink' // calm metallic grey — processing / recognition
  | 'vivid' // flowing blue→violet→pink — the "alive" Ask presence
  | 'glass' // glassy, same vivid palette (reserved nuance)
  | 'rainbow' // most expressive — maps to vivid for now
  | 'thinking' // AI is thinking — vivid churn
  | 'success' // settled positive — vivid, calmer
  | 'error'; // muted — ink

export type AIOrbIntensity = 'low' | 'medium' | 'high';
export type AIOrbSize = 'sm' | 'md' | 'lg' | 'xl';

const SIZE_PX: Record<AIOrbSize, number> = {
  sm: 72,
  md: 96,
  lg: 120,
  xl: 160,
};

// Collapse the semantic variant set onto the two shader palettes the primitive
// actually supports. `error` reads as the muted ink orb; everything expressive
// uses the vivid palette.
function paletteFor(variant: AIOrbVariant): SiriOrbVariant {
  switch (variant) {
    case 'ink':
    case 'error':
      return 'ink';
    default:
      return 'vivid';
  }
}

export interface AIOrbProps {
  variant?: AIOrbVariant;
  /** Reserved for future shader scaling; accepted now so call sites are stable. */
  intensity?: AIOrbIntensity;
  /** Named preset OR an explicit pixel size. */
  size?: AIOrbSize | number;
  /**
   * Override the auto reduce-motion detection. When the orb should be static
   * (reduce-motion on, or explicitly forced), the primitive renders a fixed,
   * non-animating frame instead of a blank canvas.
   */
  reduceMotion?: boolean;
}

export function AIOrb({ variant = 'vivid', size = 'lg', reduceMotion }: AIOrbProps) {
  const systemReduceMotion = useReducedMotion();
  const paused = reduceMotion ?? systemReduceMotion ?? false;
  const px = typeof size === 'number' ? size : SIZE_PX[size];

  return <SiriOrb size={px} variant={paletteFor(variant)} paused={paused} />;
}
