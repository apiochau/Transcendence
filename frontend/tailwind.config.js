/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#f8fafc',
        panel: '#0f172a',
        accent: '#14b8a6',
        warn: '#b45309'
      }
    },
  },
  plugins: [],
};
