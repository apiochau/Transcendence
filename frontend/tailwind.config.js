/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#121417',
        panel: '#e5e7eb',
        accent: '#0f766e',
        warn: '#b45309'
      }
    },
  },
  plugins: [],
};
