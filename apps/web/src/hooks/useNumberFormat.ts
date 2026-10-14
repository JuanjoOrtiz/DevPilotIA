import { useTranslation } from 'react-i18next';
import { formatLongDay, formatPercent, formatSeconds, formatShortDay } from '../i18n/format';

/** Números y días del dashboard en el idioma activo. */
export function useNumberFormat() {
  const { i18n } = useTranslation();
  const language = i18n.resolvedLanguage ?? i18n.language;

  return {
    percent: (ratio: number) => formatPercent(ratio, language),
    seconds: (milliseconds: number) => formatSeconds(milliseconds, language),
    shortDay: (day: string) => formatShortDay(day, language),
    longDay: (day: string) => formatLongDay(day, language),
  };
}
