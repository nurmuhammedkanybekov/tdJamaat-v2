import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
// ES2022: the language file is loaded with a top-level await (src/i18n/index.ts),
// so only the chosen language is downloaded. Every browser from 2021 on has it.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: { target: 'es2022' },
})
