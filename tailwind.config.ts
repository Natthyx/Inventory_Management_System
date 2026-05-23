import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './hooks/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui'],
        mono: ['var(--font-geist-mono)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        primary: '#1a1a2e',
        accent: '#e94560',
      },
      keyframes: {
        slideInRight: {
          '0%': {
            opacity: '0',
            transform: 'translateX(110%)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateX(0)',
          },
        },
      },
      animation: {
        slideInRight: 'slideInRight 280ms cubic-bezier(.16,1,.3,1)',
      },
    },
  },
  plugins: [],
};

export default config;
