/** Fechas en el formato del idioma activo (RNF-14) y en la zona horaria del navegador. */

const DATE: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
const TIME: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };

/** «10 oct 2026» en español, «Oct 10, 2026» en inglés. */
export function formatDate(iso: string, language: string, timeZone?: string): string {
  return new Intl.DateTimeFormat(language, { ...DATE, timeZone }).format(new Date(iso));
}

/** «10 oct 2026, 09:42» en español, «Oct 10, 2026, 09:42 AM» en inglés. */
export function formatDateTime(iso: string, language: string, timeZone?: string): string {
  return new Intl.DateTimeFormat(language, { ...DATE, ...TIME, timeZone }).format(new Date(iso));
}
