/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    // Sidebar arbitrary values
    'bg-[#0d1117]',
    'w-[232px]',
    'w-[60px]',
    'h-[60px]',
    'grid-rows-[0fr]',
    'grid-rows-[1fr]',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        // Refined neutral surface tokens
        surface: {
          DEFAULT: '#ffffff',
          50:  '#f8fafc',
          100: '#f1f5f9',
          200: '#e8ecf0',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        // Multi-layer "real" shadows
        card:    '0 1px 2px 0 rgb(0 0 0 / 0.04), 0 1px 3px 0 rgb(0 0 0 / 0.03)',
        'card-hover': '0 4px 12px -2px rgb(0 0 0 / 0.08), 0 2px 6px -2px rgb(0 0 0 / 0.05)',
        'card-lg': '0 4px 6px -2px rgb(0 0 0 / 0.05), 0 10px 15px -3px rgb(0 0 0 / 0.06)',
        dropdown: '0 4px 6px -2px rgb(0 0 0 / 0.05), 0 10px 25px -5px rgb(0 0 0 / 0.1), 0 0 0 1px rgb(0 0 0 / 0.04)',
        'btn-primary': '0 1px 2px 0 rgb(22 163 74 / 0.3), 0 0 0 0 transparent',
        'btn-primary-hover': '0 4px 12px -2px rgb(22 163 74 / 0.4)',
        header:  '0 1px 0 0 #e8ecf0, 0 1px 6px 0 rgb(0 0 0 / 0.03)',
        modal:   '0 20px 60px -12px rgb(0 0 0 / 0.25), 0 0 0 1px rgb(0 0 0 / 0.05)',
        'glow-green': '0 0 20px -4px rgb(22 163 74 / 0.35)',
        'glow-blue':  '0 0 20px -4px rgb(59 130 246 / 0.35)',
        'inner-top':  'inset 0 1px 0 0 rgb(255 255 255 / 0.08)',
        'kpi':        '0 2px 8px -2px rgb(0 0 0 / 0.08), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
        'kpi-hover':  '0 8px 24px -4px rgb(0 0 0 / 0.12), 0 2px 6px -2px rgb(0 0 0 / 0.06)',
      },
      borderColor: {
        DEFAULT: '#e8ecf0',
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      animation: {
        'fade-in':    'fadeIn 0.2s ease-out',
        'slide-up':   'slideUp 0.25s cubic-bezier(0.34,1.56,0.64,1)',
        'slide-down': 'slideDown 0.2s ease-out',
        'shimmer':    'shimmer 1.6s linear infinite',
        'float':      'float 3s ease-in-out infinite',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:    { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp:   { '0%': { opacity: '0', transform: 'translateY(8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        slideDown: { '0%': { opacity: '0', transform: 'translateY(-8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        shimmer:   { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        float:     { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-6px)' } },
        pulseSoft: { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.6' } },
      },
    },
  },
  plugins: [],
}
