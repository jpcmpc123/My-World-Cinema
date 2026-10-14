import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  // CAPACITOR=true → APK (file:// precisa de caminhos relativos);
  // produção web → GitHub Pages /My-World-Cinema/
  base: process.env.CAPACITOR === 'true'
    ? './'
    : process.env.NODE_ENV === 'production'
      ? '/My-World-Cinema/'
      : '/',
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    rollupOptions: {
      output: {
        // Supabase (pesado) fica em chunk próprio → cache separado
        manualChunks(id) {
          if (id.includes('@supabase')) return 'supabase';
        },
      },
    },
  },
})
