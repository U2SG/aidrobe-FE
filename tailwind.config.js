/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.tsx', './index.ts', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // ── Legacy tokens (kept for back-compat) ──────────────────────
        brand: {
          50: '#F7F7F8',
          100: '#E9E9EE',
          500: '#8E8E93',
          600: '#111113',
          700: '#000000',
        },
        closet: {
          cream: '#F2F2F7',
          panel: '#FFFFFF',
          ink: '#111113',
          muted: '#7A7A84',
          border: '#DADAE2',
          peach: '#FDE7E4',
          sage: '#2F7D4F',
        },
        // ── Aidrobe design tokens ──────────────────────────────────────
        // Backgrounds
        'ai-bg':     '#F2F2F7',
        'ai-bgalt':  '#F7F7F8',
        'ai-card':   '#FFFFFF',
        'ai-soft':   '#EFEDEA',
        'ai-inner':  '#FAFAFC',
        // Foreground
        'ai-ink':    '#111113',
        'ai-ink2':   '#3F3F46',
        'ai-ink3':   '#7A7A84',
        'ai-ink4':   '#B0B0B8',
        'ai-div':    '#DADAE2',
        // Accent
        'ai-acc':    '#6E6A61',
        'ai-accsoft':'#C8C5BF',
        'ai-accbg':  '#EFEDEA',
        // Semantic
        'ai-ok':     '#2F7D4F',
        'ai-okbg':   '#EAF5EE',
        'ai-warn':   '#B06E1F',
        'ai-warnbg': '#FFF2D9',
        'ai-red':    '#B42318',
        'ai-redbg':  '#FDE7E4',
        // ── Semantic text/surface tokens (FE#31) ──────────────────────
        // Mirror src/theme/design.ts so className utilities (text-inverse,
        // bg-surface, …) share the inline palette. Use `text-inverse` instead
        // of `text-white` so white text only ships where intended.
        'ink':           '#1A1714', // text-ink (primary)
        'ink-soft':      '#3F3A33', // text-ink-soft (secondary)
        'ink-muted':     '#7A736A', // text-ink-muted
        'inverse':       '#FFFFFF', // text-inverse — white on dark/controlled bg
        'surface':       '#FFFFFF',
        'surface-soft':  '#F5EFE6',
        'border-subtle': '#EFE8DC',
        'border-strong': '#E5DFD2',
      },
    },
  },
  plugins: [],
};
