import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // SkillPath brand palette — indigo primary, amber accent
        brand: {
          50: '#eef4ff',
          100: '#dae4ff',
          200: '#bccdfe',
          300: '#8eabfd',
          400: '#597ef9',
          500: '#3355f2',
          600: '#2035e4',
          700: '#1a28c7',
          800: '#1b25a0',
          900: '#1c257e',
          950: '#151b4d',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(16 24 40 / 0.06), 0 1px 3px 0 rgb(16 24 40 / 0.10)',
        'card-hover': '0 4px 6px -1px rgb(16 24 40 / 0.08), 0 10px 15px -3px rgb(16 24 40 / 0.10)',
      },
    },
  },
  plugins: [],
} satisfies Config;
