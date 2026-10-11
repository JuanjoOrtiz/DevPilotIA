import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// En desarrollo, Vite reenvía /api a la API local: el navegador ve un solo origen,
// igual que en producción (Vercel) y en Docker (nginx). Por eso la API no necesita CORS.
const apiTarget = process.env.API_PROXY_TARGET ?? 'http://localhost:3000';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // El frontend consume el código fuente de shared: no hace falta compilarlo antes.
      '@devpilot/shared': fileURLToPath(
        new URL('../../packages/shared/src/index.ts', import.meta.url),
      ),
    },
  },
  build: {
    rolldownOptions: {
      output: {
        // Las librerías cambian mucho menos que la aplicación: en su propio fichero, el
        // navegador las conserva en caché entre un despliegue y el siguiente.
        codeSplitting: { groups: [{ name: 'vendor', test: /node_modules/ }] },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: apiTarget, changeOrigin: true },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
