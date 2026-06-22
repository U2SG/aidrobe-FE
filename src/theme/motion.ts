// Motion design tokens — the house "motion language" so timings/easings/springs
// are consistent across screens instead of ad-hoc per call site. Kept as a
// standalone module (not folded into `design`) so existing `design` exports
// never change. Values lean editorial-ink: calm, never bouncy or attention-
// grabbing. Respect reduce-motion at the call site via reanimated's
// `useReducedMotion()` — these are the "motion on" values.

import { Easing } from 'react-native-reanimated';

/** Standard durations (ms). Use `instant` as the reduce-motion fallback. */
export const duration = {
  instant: 0,
  fast: 140,
  base: 240,
  slow: 420,
  // Long ambient loops (e.g. the AI orb churn) — not a transition, a vibe.
  ambient: 1600,
} as const;

/** Easing curves. `standard` for most enter/exit; `decelerate` for entrances. */
export const easing = {
  standard: Easing.bezier(0.4, 0.0, 0.2, 1),
  decelerate: Easing.bezier(0.0, 0.0, 0.2, 1),
  accelerate: Easing.bezier(0.4, 0.0, 1, 1),
} as const;

/** Spring presets for reanimated `withSpring`. Restrained — low overshoot. */
export const spring = {
  // Default UI spring: settles quickly, barely overshoots.
  gentle: { damping: 18, stiffness: 180, mass: 1 },
  // Snappier for small affordances (button press, chip).
  snappy: { damping: 22, stiffness: 320, mass: 0.8 },
} as const;

export const motion = { duration, easing, spring } as const;

export type MotionDuration = keyof typeof duration;
export type MotionSpring = keyof typeof spring;
