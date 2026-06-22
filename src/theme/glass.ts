// Translucent "glass" surface tokens — for floating controls / overlays that
// sit over content (processing overlays, toasts, sheets). Pure rgba + border so
// nothing here pulls a blur dependency (expo-blur / BlurView not assumed
// present, and "no heavy deps" is a hard constraint). Pair with a real
// BlurView only where one already exists; otherwise the rgba fill alone reads
// as a frosted surface over the warm editorial-ink background.
//
// Standalone module (not merged into `design`) so existing exports are intact.

export const glass = {
  // Light frosted surface over the warm background — default floating control.
  surface: {
    backgroundColor: 'rgba(250, 247, 240, 0.72)',
    borderColor: 'rgba(229, 223, 210, 0.8)',
    borderWidth: 1,
  },
  // Slightly more opaque — for content that needs readable body text on top.
  surfaceStrong: {
    backgroundColor: 'rgba(250, 247, 240, 0.92)',
    borderColor: 'rgba(229, 223, 210, 0.9)',
    borderWidth: 1,
  },
  // Inverted scrim — dim layer behind a modal/overlay so the orb pops.
  scrim: {
    backgroundColor: 'rgba(26, 23, 20, 0.32)',
  },
  // Highlight edge to fake a top-lit glass rim on cards/buttons.
  highlight: {
    borderTopColor: 'rgba(255, 255, 255, 0.55)',
    borderTopWidth: 1,
  },
} as const;

export type GlassSurface = keyof typeof glass;
