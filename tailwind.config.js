/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./script.js",
    "./src/**/*.{html,js}"
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#070B14', // bg-deep
          900: '#0B1120', // bg-main
          850: '#0E1626',
          800: '#0F172A', // Deep Midnight Navy base
          700: '#152037', // bg-card
          600: '#1E293B', // bg-elevated
          500: '#25334D',
          400: '#334155',
          border: 'rgba(148, 163, 184, 0.15)',
        },
        gold: {
          100: '#FDF9EE',
          200: '#F6E7B8',
          300: '#EED482',
          400: '#E5C158',
          500: '#D4AF37', // Champagne Gold primary
          600: '#DFB15B', // Gold hover
          700: '#B89228',
          800: '#A37F1B',
          dim: 'rgba(212, 175, 55, 0.15)',
          border: 'rgba(212, 175, 55, 0.35)',
          cardBorder: 'rgba(212, 175, 55, 0.2)',
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        serif: ['"Playfair Display"', 'serif'],
      },
      boxShadow: {
        'gold-sm': '0 4px 14px rgba(212, 175, 55, 0.35)',
        'gold-md': '0 6px 20px rgba(212, 175, 55, 0.5)',
        'gold-glow': '0 0 25px rgba(212, 175, 55, 0.25)',
        'card': '0 8px 24px rgba(0, 0, 0, 0.45)',
        'modal': '0 16px 40px rgba(0, 0, 0, 0.6), 0 0 25px rgba(212, 175, 55, 0.25)',
      },
      borderRadius: {
        'card': '12px',
        'badge': '9999px',
      }
    },
  },
  plugins: [],
}
