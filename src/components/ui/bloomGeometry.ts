// SiriBloomOrb geometry — extracted import-free so the "glow never clips"
// invariant is testable under Node type-stripping (scripts/bloomGeometry.test.ts),
// while the .tsx component stays a thin Skia renderer over these numbers.

// Breathe scales dot radii by 1 ± 0.16; the halo circle is 2.3× the core; the
// Skia blur (sigma = dotR·0.9) has a visible tail of roughly 2σ past the halo
// edge. These mirror the constants in SiriBloomOrb.tsx.
export const BREATHE_MAX = 1.16;
export const HALO_SCALE = 2.3;
export const BLUR_SIGMA_SCALE = 0.9;
const VISIBLE_BLUR_SIGMAS = 2;

export interface BloomGeometry {
  /** Extra canvas on each side so halos/blur never hit the canvas edge. */
  bleed: number;
  /** Canvas edge length; the LAYOUT footprint stays `size`. */
  canvas: number;
  center: number;
  ringR: number;
  dotR: number;
  bigR: number;
}

export function bloomGeometry(size: number): BloomGeometry {
  const bleed = Math.ceil(size * 0.25);
  const canvas = size + bleed * 2;
  return {
    bleed,
    canvas,
    center: canvas / 2,
    ringR: size * 0.32,
    dotR: size * 0.075,
    bigR: size * 0.2,
  };
}

/** Farthest visible glow from the center: ring + breathing halo + blur tail. */
export function maxHaloExtent(size: number): number {
  const g = bloomGeometry(size);
  const dotMax = g.dotR * BREATHE_MAX;
  return g.ringR + dotMax * HALO_SCALE + g.dotR * BLUR_SIGMA_SCALE * VISIBLE_BLUR_SIGMAS;
}
