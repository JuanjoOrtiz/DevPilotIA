import { useTranslation } from 'react-i18next';
import { formatDate, formatDateTime } from '../i18n/format';

/** Formato de fechas en el idioma activo: cambia en cuanto el usuario cambia de idioma. */
export function useDateFormat() {
  const { i18n } = useTranslation();
  const language = i18n.resolvedLanguage ?? i18n.language;

  return {
    date: (iso: string) => formatDate(iso, language),
    dateTime: (iso: string) => formatDateTime(iso, language),
  };
}
