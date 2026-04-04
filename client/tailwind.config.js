/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        coc: {
          bg:      '#0f1117',
          panel:   '#1c1f2e',
          panel2:  '#242840',
          border:  '#2d3148',
          accent:  '#f59e0b',
          'accent-hover': '#fbbf24',
          text:    '#f0f0f0',
          muted:   '#64748b',
          danger:  '#ef4444',
          san:     '#60a5fa',
          hp:      '#22c55e',
          mp:      '#a78bfa',
          luck:    '#fb923c',
        },
      },
      fontFamily: {
        sans: ['Pretendard', 'Noto Sans KR', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
