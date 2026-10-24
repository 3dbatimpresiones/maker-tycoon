import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base relativa: el mismo build funciona en GitHub Pages (/maker-tycoon/),
// en una subcarpeta de 3dbat.com.ar o embebido más adelante en BATBOX.
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { port: 5180, strictPort: true },
  preview: { port: 4180, strictPort: true },
});
