/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0B0F17',
        surface: '#111827',
        'surface-elevated': '#1F2937',
        primary: {
          DEFAULT: '#00F0FF',
          dark: '#00B4D8',
          glow: 'rgba(0, 240, 255, 0.4)',
        },
        accent: {
          cyan: '#00F0FF',
          blue: '#3B82F6',
          purple: '#8B5CF6',
        },
        tumor: {
          et: '#EF4444', // Enhancing Tumor (Coral/Red)
          ncr: '#F59E0B', // Necrotic Core (Amber)
          ed: '#10B981', // Peritumoral Edema (Emerald/Green)
          wt: '#EC4899', // Whole Tumor (Pink/Magenta)
          tc: '#F97316', // Tumor Core (Orange)
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'glow-cyan': '0 0 25px rgba(0, 240, 255, 0.25)',
        'glow-coral': '0 0 25px rgba(239, 68, 68, 0.3)',
        'glow-emerald': '0 0 25px rgba(16, 185, 129, 0.3)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scan': 'scan 4s linear infinite',
      },
      keyframes: {
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        }
      }
    },
  },
  plugins: [],
}
