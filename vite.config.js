import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  root: 'client',
  plugins: [vue()],
  resolve: { alias: { '@': fileURLToPath(new URL('./client/src', import.meta.url)) } },
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:3001' },
  },
  build: { outDir: '../dist', emptyOutDir: true, chunkSizeWarningLimit: 1500 },
})
