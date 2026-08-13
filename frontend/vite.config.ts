import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // "@/..." 형태로 src 폴더를 절대경로처럼 import하기 위한 별칭
      '@': path.resolve(__dirname, './src'),
    },
  },
})
