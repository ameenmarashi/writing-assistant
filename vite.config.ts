import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // GitHub Pages serves this project from /writing-assistant/, not the domain root.
  base: command === 'build' ? '/writing-assistant/' : '/',
  plugins: [react()],
}))
