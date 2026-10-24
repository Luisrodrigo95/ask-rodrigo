/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        paper: '#0b0f17',
        panel: '#111827',
        sunken: '#182234',
        edge: '#263346',
        ink: '#f8fafc',
        muted: '#94a3b8',
        faint: '#64748b',
        accent: '#14b8a6',
        'accent-orange': '#d9714d',
        cyber: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          900: '#134e4a',
        },
        darkbg: '#0a0f1d',
        surface: '#111827',
        surfaceLight: '#1f2937'
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Menlo', 'Courier New', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif']
      }
    },
  },
  plugins: [],
}
