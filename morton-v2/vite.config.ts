import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Relative base so the built styleframe review page also opens from a
  // sub-path (e.g. GitHub Pages project site) without extra configuration.
  base: './',
  plugins: [react()],
  server: { host: '127.0.0.1', port: 5290, strictPort: true },
  preview: { host: '127.0.0.1', port: 5291, strictPort: true },
  build: { target: 'es2022', chunkSizeWarningLimit: 1200 },
})
