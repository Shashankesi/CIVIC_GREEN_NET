/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
          950: '#022c22'
        },
        // Dark theme surfaces
        surface: {
          DEFAULT: '#ffffff',
          dark: '#0B1220',
          darker: '#07111F',
          card: '#111827',
          border: '#1e293b'
        },
        ai: {
          DEFAULT: '#7c3aed',
          light: '#a78bfa',
          dark: '#5b21b6'
        }
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial']
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(0,0,0,0.06), 0 1px 2px -1px rgba(0,0,0,0.06)',
        'card-hover': '0 8px 30px -6px rgba(0,0,0,0.12), 0 2px 6px -2px rgba(0,0,0,0.06)',
        glow: '0 0 0 1px rgba(16,185,129,0.15), 0 4px 20px -2px rgba(16,185,129,0.2)',
        'glow-ai': '0 0 0 1px rgba(124,58,237,0.15), 0 4px 20px -2px rgba(124,58,237,0.2)',
        'officer-card': '0 4px 24px -4px rgba(16,185,129,0.12), 0 1px 4px -1px rgba(0,0,0,0.06)',
        'officer-card-hover': '0 12px 36px -8px rgba(16,185,129,0.18), 0 4px 12px -2px rgba(0,0,0,0.08)',
        'officer-glow': '0 0 20px rgba(16,185,129,0.15), 0 0 60px rgba(16,185,129,0.05)'
      },
      borderRadius: {
        xl: '0.9rem',
        '2xl': '1.25rem'
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' }
        },
        'fade-up': {
          '0%': { opacity: 0, transform: 'translateY(12px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' }
        },
        'officer-float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-3px)' }
        },
        'officer-glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 12px rgba(16,185,129,0.2)' },
          '50%': { boxShadow: '0 0 24px rgba(16,185,129,0.4)' }
        },
        'officer-status-pulse': {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.5 }
        }
      },
      animation: {
        shimmer: 'shimmer 2s linear infinite',
        'fade-up': 'fade-up 0.5s ease-out',
        'officer-float': 'officer-float 3s ease-in-out infinite',
        'officer-glow-pulse': 'officer-glow-pulse 2.5s ease-in-out infinite',
        'officer-status-pulse': 'officer-status-pulse 2s ease-in-out infinite'
      }
    }
  },
  plugins: []
};
