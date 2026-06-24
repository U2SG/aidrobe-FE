export const colors = {
  background: '#FAF7F0',
  groupedBackground: '#F1ECE2',
  elevated: '#FFFFFF',
  secondaryElevated: '#F5EFE6',
  fill: '#EEE6DA',
  separator: '#E5DFD2',
  separatorSoft: '#EFE8DC',
  label: '#1A1714',
  secondaryLabel: '#3F3A33',
  tertiaryLabel: '#7A736A',
  quaternaryLabel: '#A7A09A',
  accent: '#B08D5B',
  accentSoft: '#F4E8D1',
  success: '#3F8060',
  successBg: '#EDF4EE',
  warning: '#C8924A',
  warningBg: '#F8E9C8',
  danger: '#B85C4A',
  dangerBg: '#F6DDD6',
  inverse: '#FFFFFF',

  // ── Semantic aliases (FE#31) ───────────────────────────────────────────
  // Canonical, intent-named vocabulary for new code + the NativeWind theme
  // (tailwind.config maps these to `text-*`/`bg-*`/`border-*` utilities). They
  // mirror the iOS-named tokens above (kept for existing call sites) so there's
  // one palette, two names — never hardcode `#fff`/`text-white`; use `inverse`
  // / `textInverse` instead.
  textPrimary: '#1A1714', // = label
  textSecondary: '#3F3A33', // = secondaryLabel
  textMuted: '#7A736A', // = tertiaryLabel
  textInverse: '#FFFFFF', // = inverse — white text, only on dark/controlled bg
  surface: '#FFFFFF', // = elevated
  surfaceElevated: '#F5EFE6', // = secondaryElevated
  borderSubtle: '#EFE8DC', // = separatorSoft
  borderStrong: '#E5DFD2', // = separator
} as const;

export const radius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  pill: 999,
} as const;

export const spacing = {
  screen: 20,
  section: 24,
  row: 16,
  control: 12,
} as const;

export const type = {
  largeTitle: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  title1: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  title2: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
  },
  headline: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600',
  },
  body: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '400',
  },
  callout: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
  },
  footnote: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
  },
  caption: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '500',
  },
} as const;

export const shadow = {
  soft: {
    shadowColor: '#3C2814',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  elevated: {
    shadowColor: '#3C2814',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 22,
    elevation: 5,
  },
} as const;

export const design = { colors, radius, spacing, type, shadow } as const;
