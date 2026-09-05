/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      colors: {
        ink: '#0f172a',
        teal: { 500: '#14b8a6', 600: '#0d9488' },
      },
      boxShadow: { soft: '0 8px 30px rgba(15,23,42,.08)' },
    },
  },
  plugins: [],
};
