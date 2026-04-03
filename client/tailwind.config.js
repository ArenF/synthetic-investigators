/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        coc: {
          bg: '#1a1614',
          panel: '#231f1c',
          border: '#3d3530',
          accent: '#c9a96e',
          danger: '#c94040',
          san: '#4a90c4',
          hp: '#5a9e5a',
          text: '#e8ddd0',
          muted: '#8a7a6a',
        },
      },
    },
  },
  plugins: [],
}
