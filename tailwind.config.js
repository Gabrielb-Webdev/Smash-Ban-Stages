/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        smash: {
          red: '#E74C3C',
          blue: '#3498DB',
          yellow: '#F39C12',
          purple: '#9B59B6',
          dark: '#1A1A2E',
          darker: '#0F0F1E',
          light: '#EAEAEA',
        },
      },
      animation: {
        'ban-fade': 'banFade 0.5s ease-out forwards',
        'select-glow': 'selectGlow 1s ease-out forwards',
        'slide-up': 'slideUp 0.8s ease-out forwards',
        'pulse-grow': 'pulseGrow 0.5s ease-out forwards',
      },
      keyframes: {
        banFade: {
          '0%': { opacity: '1', filter: 'grayscale(0%)' },
          '100%': { opacity: '0.3', filter: 'grayscale(100%)' },
        },
        selectGlow: {
          '0%': { transform: 'scale(1)', boxShadow: '0 0 0px rgba(52, 152, 219, 0)' },
          '50%': { transform: 'scale(1.1)', boxShadow: '0 0 30px rgba(52, 152, 219, 1)' },
          '100%': { transform: 'scale(1.05)', boxShadow: '0 0 20px rgba(52, 152, 219, 0.8)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pulseGrow: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.15)' },
        },
      },
    },
  },
  plugins: [],
}
