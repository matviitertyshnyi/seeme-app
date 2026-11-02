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
        canvas: '#F8FAFC',
        ink: '#0F172A',
        brand: {
          DEFAULT: '#4F46E5',
          light: '#6366F1',
          dark: '#4338CA',
          soft: '#EEF2FF',
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
