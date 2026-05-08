import type { Config } from 'tailwindcss';

export default {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      boxShadow: {
        glass: '0 20px 60px rgba(15, 23, 42, 0.18)',
      },
      backgroundImage: {
        hero: 'radial-gradient(circle at top, rgba(56, 189, 248, 0.2), transparent 35%), radial-gradient(circle at bottom right, rgba(168, 85, 247, 0.18), transparent 25%)',
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        fadeIn: 'fadeIn 0.8s ease-out forwards',
      },
      keyframes: {
        float: {
          '0%,100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
