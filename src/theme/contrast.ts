import { colors } from '@/theme/design';

// Lightweight readability guard for the app's known theme colors. NOT a full
// WCAG engine — its only job is to stop the obvious failure mode of white text
// on the many light beige backgrounds (#FAF7F0 / #F1ECE2 / #F5EFE6 / #EEE6DA /
// #F4E8D1). Backgrounds dark enough to carry white text are enumerated below;
// everything else (and any unknown color) is treated as light.
const DARK_BACKGROUNDS = new Set<string>([
  colors.label, // #1A1714
  colors.secondaryLabel, // #3F3A33
]);

/** True when white text would be readable on this background. */
export function isDarkBackground(background: string): boolean {
  return DARK_BACKGROUNDS.has(background);
}

/**
 * Safety net for a caller's desired foreground. Returns `desired` untouched
 * unless it is white on a light background, in which case it falls back to dark
 * ink. Brand colors (danger red, etc.) pass through unchanged. Routing every
 * foreground through this makes "no white-on-beige" a structural invariant
 * rather than a per-call-site convention.
 */
export function guardForeground(background: string, desired: string): string {
  if (desired === colors.inverse && !isDarkBackground(background)) {
    return colors.label;
  }
  return desired;
}
