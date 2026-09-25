import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Manrope', 'system-ui', 'sans-serif']
      },
      colors: {
        accent: '#6C5CE7',
        accentDark: '#5642C9',
        accentSoft: '#EEEBFC',
        ink: '#1F2430',
        muted: '#6B7280',
        line: '#E4E6EF',
        bg: '#F6F7FB'
      }
    }
  },
  plugins: []
};

export default config;
