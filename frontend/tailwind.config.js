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
        institutional: {
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
          950: '#0f295e',
          nav: '#0c356a',
          navDark: '#082046',
          accent: '#0284c7',
          gold: '#eab308',
          goldDark: '#ca8a04',
          darkBg: '#0b1329',
          darkCard: '#131e3a',
          darkCardHover: '#1c2b50',
          darkBorder: '#1f2e54',
          lightBg: '#f1f5f9',
          lightCard: '#ffffff',
          lightBorder: '#e2e8f0',
        }
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      }
    },
  },
  plugins: [],
}
