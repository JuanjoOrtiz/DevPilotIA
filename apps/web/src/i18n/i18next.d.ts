import type es from './locales/es.json';

// Con esto, TypeScript comprueba que cada clave pasada a t() existe en es.json.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: { translation: typeof es };
  }
}
