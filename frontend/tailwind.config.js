/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#121417',
        panel: '#f7f8fa',
        accent: '#0f766e',
        warn: '#b45309'
      }
    },
  },
  plugins: [],
};
