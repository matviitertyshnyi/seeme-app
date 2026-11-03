import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        canvas: {
          DEFAULT: '#FAF8F5',
          dark: '#141210',
        },
        ink: {
          DEFAULT: '#1C1917',
          dark: '#FAF8F5',
          muted: '#78716C',
          'muted-dark': '#A8A29E',
          subtle: '#A8A29E',
          'subtle-dark': '#78716C',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          dark: '#1C1917',
          subtle: '#F5F2EB',
          'subtle-dark': '#262220',
        },
        border: {
          DEFAULT: '#E7E2D9',
          dark: '#292524',
          strong: '#D6D0C4',
          'strong-dark': '#44403C',
        },
        brand: {
          DEFAULT: '#EA580C', // Warm Orange 600
          dark: '#C2410C',    // Orange 700 (Hover)
          hover: '#C2410C',
          light: '#F97316',   // Orange 500
          accent: '#FB923C',  // Orange 400
          soft: '#FFF7ED',    // Orange 50
          'surface-dark': '#2A170F',
          'muted-dark': '#FDBA74',
        },
        amber: {
          DEFAULT: '#D97706', // Golden Amber 600
          dark: '#B45309',    // Amber 700
          light: '#F59E0B',   // Amber 500
          accent: '#FBBF24',  // Amber 400
          soft: '#FFFBEB',    // Amber 50
        },
        // Alias indigo scale to warm orange/amber to eliminate cold blue leakage
        indigo: {
          50: '#FFF7ED',
          100: '#FFEDD5',
          200: '#FED7AA',
          300: '#FDBA74',
          400: '#FB923C',
          500: '#F97316',
          600: '#EA580C',
          700: '#C2410C',
          800: '#9A3412',
          900: '#7C2D12',
          950: '#431407',
        },
        status: {
          live: {
            DEFAULT: '#047857', // Emerald 700 (Passes AA white text)
            hover: '#065F46',   // Emerald 800
            accent: '#10B981',  // Emerald 500
            light: '#ECFDF5',   // Emerald 50
            'text-dark': '#A7F3D0', // Emerald 200
            'surface-dark': '#022C22', // Emerald 950
          },
          upcoming: {
            DEFAULT: '#B45309', // Amber 700 (Passes AA text)
            bg: '#FBBF24',      // Amber 400 (Solid badge bg with slate-950 text)
            accent: '#F59E0B',  // Amber 500
            light: '#FFFBEB',   // Amber 50
            'text-dark': '#FDE68A', // Amber 200
            'surface-dark': '#451A03', // Amber 950
          },
          finished: {
            DEFAULT: '#BE123C', // Rose 700 (Passes AA white text)
            hover: '#9F1239',   // Rose 800
            accent: '#F43F5E',  // Rose 500
            light: '#FFF1F2',   // Rose 50
            'text-dark': '#FECDD3', // Rose 200
            'surface-dark': '#4C0519', // Rose 950
          },
        },
      },
      boxShadow: {
        ambient:
          '0 4px 14px -3px rgba(15, 23, 42, 0.06), 0 1px 4px -1px rgba(15, 23, 42, 0.04)',
        'ambient-lg':
          '0 10px 24px -5px rgba(15, 23, 42, 0.08), 0 2px 6px -2px rgba(15, 23, 42, 0.04)',
        /* Clean neutral subtle shadow - zero neon purple bloom */
        brand: '0 1px 2px 0 rgba(15, 23, 42, 0.08)',
      },
    },
  },
  plugins: [],
};

export default config;
