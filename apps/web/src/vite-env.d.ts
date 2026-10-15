/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** DSN público de Sentry para la web. Sin él, la monitorización queda desactivada. */
  readonly VITE_SENTRY_DSN?: string;
  /** Versión desplegada: el SHA del commit en Vercel. */
  readonly VITE_APP_VERSION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
