import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
      },
      // Custom transition durations from design tokens
      transitionDuration: {
        'fast': '150ms',
        'normal': '300ms',
        'slow': '500ms',
        'slower': '700ms',
      },
      // Custom backdrop blur values
      backdropBlur: {
        'modal': '8px',
        'overlay': '4px',
        'glass': '12px',
      },
      // Custom box shadows aligned with design tokens
      boxShadow: {
        'cosmic-sm': '0 0 10px rgba(167, 139, 250, 0.2)',
        'cosmic-md': '0 0 20px rgba(167, 139, 250, 0.3)',
        'cosmic-lg': '0 0 40px rgba(167, 139, 250, 0.4)',
        'cosmic-xl': '0 0 60px rgba(167, 139, 250, 0.5)',
      },
      animation: {
        fadeIn: 'fadeIn 0.3s ease-in-out',
        starPulse: 'starPulse 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(-4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        starPulse: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.85', transform: 'scale(0.98)' },
        },
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
}
export default config
