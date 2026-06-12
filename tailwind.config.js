/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.tsx', './index.ts', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // ── Legacy tokens (kept for back-compat) ──────────────────────
        brand: {
          50: '#f7f3ec',
          100: '#edeae4',
          500: '#7f8f6f',
          600: '#6f8060',
          700: '#556347',
        },
        closet: {
          cream: '#f7f3ec',
          panel: '#fffdf8',
          ink: '#1c1c1a',
          muted: '#817c70',
          border: '#e6dfd2',
          peach: '#f5d8cd',
          sage: '#7f8f6f',
        },
        // ── Aidrobe design tokens ──────────────────────────────────────
        // Backgrounds
        'ai-bg':     '#F5EFE6',
        'ai-bgalt':  '#FAF6EE',
        'ai-card':   '#FFFFFF',
        'ai-soft':   '#F8F3E9',
        'ai-inner':  '#FBF7EF',
        // Foreground
        'ai-ink':    '#1A1714',
        'ai-ink2':   '#3A332B',
        'ai-ink3':   '#807468',
        'ai-ink4':   '#B8AC9D',
        'ai-div':    '#EBE3D5',
        // Accent
        'ai-acc':    '#B08D5B',
        'ai-accsoft':'#D4B687',
        'ai-accbg':  '#EFE5D2',
        // Semantic
        'ai-ok':     '#7A9B6E',
        'ai-okbg':   '#E5EDDF',
        'ai-warn':   '#C8924A',
        'ai-warnbg': '#F4E8D1',
        'ai-red':    '#B85C4A',
        'ai-redbg':  '#F0D9D2',
      },
    },
  },
  plugins: [],
};
