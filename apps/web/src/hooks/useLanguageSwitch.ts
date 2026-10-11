import { useTranslation } from 'react-i18next';
import { LANGUAGES } from '../i18n';

/** Propiedades del selector de idioma, comunes a todas las páginas. */
export function useLanguageSwitch() {
  const { t, i18n } = useTranslation();

  return {
    groupLabel: t('language.label'),
    languages: LANGUAGES,
    current: i18n.resolvedLanguage ?? i18n.language,
    onChange: (code: string) => void i18n.changeLanguage(code),
  };
}
