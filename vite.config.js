import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages プロジェクトページ配信のためのサブパス（deploy-pages スキル準拠）
export default defineConfig({
  base: '/weekend-planner/',
  plugins: [react()],
})
