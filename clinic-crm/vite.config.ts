import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    // lightningcss doesn't support var(--spacing(n)) from Tailwind v4 / shadcn v4
    cssMinify: false,
  },
})
