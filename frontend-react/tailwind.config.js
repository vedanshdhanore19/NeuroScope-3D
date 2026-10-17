/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#f4f7fb',
          surface: '#ffffff',
          accent: '#edf5fe',
          viewport: '#0a0f1d',
          panel: '#111827',
        },
        navy: {
          DEFAULT: '#0b192c',
          dark: '#07101e',
          light: '#1e293b',
        },
        cyan: {
          DEFAULT: '#0284c7',
          light: '#38bdf8',
        },
        mint: {
          DEFAULT: '#00d690',
          dark: '#059669',
          soft: '#e6fcf5',
        },
        amber: {
          DEFAULT: '#f59e0b',
          soft: '#fef3c7',
        },
        coral: {
          DEFAULT: '#ef4444',
          soft: '#fee2e2',
        },
        tumor: {
          wt: '#00d690',
          tc: '#f59e0b',
          et: '#ef4444',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans Variable"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        'sm': '8px',
        'md': '14px',
        'lg': '20px',
        'xl': '28px',
      },
      boxShadow: {
        'card': '0 10px 25px -5px rgba(15, 30, 60, 0.06), 0 8px 10px -6px rgba(15, 30, 60, 0.04)',
        'card-hover': '0 20px 45px -12px rgba(15, 30, 60, 0.09)',
        'mint-glow': '0 8px 24px -4px rgba(0, 214, 144, 0.35)',
        'cyan-glow': '0 0 35px -5px rgba(2, 132, 199, 0.22)',
      },
    },
  },
  plugins: [],
}
