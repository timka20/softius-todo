import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  plugins: [react()],
  server: {
    port: 14364,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:14365',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        credentials: 'include',
      },
    },
  },
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
  },
});
