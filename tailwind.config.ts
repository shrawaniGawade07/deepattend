import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      keyframes: {
        scanMove: {
          '0%':   { top: '0%',   opacity: '0' },
          '5%':   { opacity: '1' },
          '95%':  { opacity: '1' },
          '100%': { top: '100%', opacity: '0' },
        },
      },
      animation: {
        scan: 'scanMove 1.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
