import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// Served from https://vorlis08.github.io/weavo/ in production, root in dev.
// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/weavo/' : '/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
}))
