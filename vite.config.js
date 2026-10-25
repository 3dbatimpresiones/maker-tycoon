import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Identificador de cada publicación: el juego lo compara con version.json para avisar
// "hay una versión nueva, recargá la página".
const BUILD = Date.now().toString(36);

// base relativa: el mismo build funciona en GitHub Pages (/maker-tycoon/),
// en una subcarpeta de 3dbat.com.ar o embebido más adelante en BATBOX.
export default defineConfig({
  base: './',
  define: { __BUILD__: JSON.stringify(BUILD) },
  plugins: [react(), {
    name: 'mt-version-json',
    generateBundle() { this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ build: BUILD, at: new Date().toISOString() }) }); },
  }],
  build: { chunkSizeWarningLimit: 900 },
  server: { port: 5180, strictPort: true },
  preview: { port: 4180, strictPort: true },
});
