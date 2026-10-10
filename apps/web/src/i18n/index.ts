import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import es from './locales/es.json';

export const LANGUAGES = [
  { code: 'es', label: 'ES' },
  { code: 'en', label: 'EN' },
] as const;

export type Language = (typeof LANGUAGES)[number]['code'];

const STORAGE_KEY = 'devpilot.language';

function isLanguage(value: unknown): value is Language {
  return LANGUAGES.some((language) => language.code === value);
}

/** Preferencia guardada; si no hay, el idioma del navegador (RNF-14). */
function initialLanguage(): Language {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isLanguage(stored)) return stored;
  } catch {
    // Almacenamiento bloqueado: se sigue con el idioma del navegador.
  }
  return window.navigator.language.toLowerCase().startsWith('en') ? 'en' : 'es';
}

void i18n.use(initReactI18next).init({
  resources: {
    es: { translation: es },
    en: { translation: en },
  },
  lng: initialLanguage(),
  fallbackLng: 'es',
  // React ya escapa el texto al pintarlo.
  interpolation: { escapeValue: false },
});

function applyLanguage(language: string): void {
  document.documentElement.lang = language;
  try {
    window.localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // Sin almacenamiento, la preferencia dura lo que dure la pestaña.
  }
}

applyLanguage(i18n.language);
i18n.on('languageChanged', applyLanguage);

export default i18n;
