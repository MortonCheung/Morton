import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Relative base so the production build also works from a sub-path
  // (e.g. GitHub Pages project sites) without extra configuration.
  base: './',
  plugins: [react()],
  server: { host: '127.0.0.1', port: 5185, strictPort: true },
  preview: { host: '127.0.0.1', port: 5285, strictPort: true },
  build: { target: 'es2022', chunkSizeWarningLimit: 1200 },
})
