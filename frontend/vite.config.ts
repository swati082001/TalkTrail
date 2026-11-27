import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // "@/components/ui/button" -> "<frontend>/src/components/ui/button".
    // tsconfig "paths" only teaches TypeScript; this teaches the bundler.
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
})
