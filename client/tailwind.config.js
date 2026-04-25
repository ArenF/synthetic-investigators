import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    resolve(__dirname, 'index.html'),
    resolve(__dirname, 'src/**/*.{ts,svelte}'),
  ],
  theme: {
    extend: {
      colors: {
        /* 밤바다 — 배경·패널·텍스트 */
        sea: {
          deep:       '#01162b',
          panel:      '#00385a',
          text:       '#6a90b4',
          'text-light': '#d2dbeb',
        },
        /* 보랏빛 은하수 — 인터랙티브·강조·액센트 */
        galaxy: {
          bg:     '#262e4c',
          hover:  '#45538a',
          accent: '#b199db',
          label:  '#c9ccd3',
          muted:  '#724972',
        },
        /* 게임 상태 */
        hp:     '#4ade80',
        san:    '#60a5fa',
        danger: '#f87171',
        warn:   '#fb923c',
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans KR', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
