import { fileURLToPath, URL } from 'node:url';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// En desarrollo, Vite reenvía /api a la API local: el navegador ve un solo origen,
// igual que en producción (Vercel) y en Docker (nginx). Por eso la API no necesita CORS.
const apiTarget = process.env.API_PROXY_TARGET ?? 'http://localhost:3000';

// Versión desplegada: en Vercel, el SHA del commit. Sentry la usa para agrupar los errores.
const version = process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.APP_VERSION ?? 'dev';

// RNF-15: los source maps se suben a Sentry en el build y se borran de lo que se publica.
// Solo si están las tres variables; si no, ni se generan.
const { SENTRY_AUTH_TOKEN, SENTRY_ORG, SENTRY_PROJECT } = process.env;
const uploadSourceMaps = Boolean(SENTRY_AUTH_TOKEN && SENTRY_ORG && SENTRY_PROJECT);

export default defineConfig({
  plugins: [
    react(),
    ...(uploadSourceMaps
      ? [
          sentryVitePlugin({
            org: SENTRY_ORG,
            project: SENTRY_PROJECT,
            authToken: SENTRY_AUTH_TOKEN,
            release: { name: version },
            sourcemaps: { filesToDeleteAfterUpload: ['./dist/**/*.map'] },
            telemetry: false,
          }),
        ]
      : []),
  ],
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(version),
  },
  resolve: {
    alias: {
      // El frontend consume el código fuente de shared: no hace falta compilarlo antes.
      '@devpilot/shared': fileURLToPath(
        new URL('../../packages/shared/src/index.ts', import.meta.url),
      ),
    },
  },
  build: {
    sourcemap: uploadSourceMaps ? 'hidden' : false,
    rolldownOptions: {
      output: {
        // Las librerías cambian mucho menos que la aplicación: en su propio fichero, el
        // navegador las conserva en caché entre un despliegue y el siguiente.
        // Las gráficas van aparte: solo las descarga quien abre el dashboard.
        codeSplitting: {
          groups: [
            {
              name: 'charts',
              test: /node_modules[\\/](recharts|victory-vendor|d3-[^\\/]+|@reduxjs|react-redux|redux|immer|reselect|es-toolkit|decimal\.js-light|eventemitter3)[\\/]/,
              priority: 1,
            },
            // El router va aparte del resto de librerías para que ningún fichero pase de 500 kB.
            { name: 'router', test: /node_modules[\\/]react-router[\\/]/, priority: 1 },
            { name: 'vendor', test: /node_modules/ },
          ],
        },
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
