/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0A0E17',
        surface: {
          DEFAULT: '#0F1623',
          elevated: '#151D2C',
          subtle: '#1A2336',
          border: 'rgba(255, 255, 255, 0.08)',
          'border-hover': 'rgba(255, 255, 255, 0.15)',
        },
        primary: {
          DEFAULT: '#22D3EE', // Cyan
          dark: '#06B6D4',
          glow: 'rgba(34, 211, 238, 0.15)',
        },
        accent: {
          cyan: '#22D3EE',
          blue: '#3B82F6',
          indigo: '#6366F1',
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
        sans: ['"Inter Variable"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'subtle': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'card': '0 4px 20px -2px rgba(0, 0, 0, 0.5)',
        'glow-cyan': '0 0 20px rgba(34, 211, 238, 0.15)',
        'glow-blue': '0 0 20px rgba(59, 130, 246, 0.15)',
      },
    },
  },
  plugins: [],
}
