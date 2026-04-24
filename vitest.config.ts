import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // .js 확장자 import를 .ts로 resolve (서버 코드가 .js로 import함)
    alias: {
      // TypeScript 소스를 직접 참조
    },
  },
  resolve: {
    // 서버 코드의 'xxx.js' import를 'xxx.ts'로 리매핑
    extensions: ['.ts', '.js'],
  },
})
