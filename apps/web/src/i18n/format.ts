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

/** Un día `YYYY-MM-DD` del servidor es un día UTC: se formatea en UTC para no moverlo. */
function utcDay(day: string): Date {
  return new Date(`${day}T00:00:00.000Z`);
}

/** «11 oct» en español, «Oct 11» en inglés. */
export function formatShortDay(day: string, language: string): string {
  return new Intl.DateTimeFormat(language, {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(utcDay(day));
}

/** «11 de septiembre de 2026» en español, «September 11, 2026» en inglés. */
export function formatLongDay(day: string, language: string): string {
  return new Intl.DateTimeFormat(language, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(utcDay(day));
}

/** Una proporción entre 0 y 1: «88 %» en español, «88%» en inglés. */
export function formatPercent(ratio: number, language: string): string {
  return new Intl.NumberFormat(language, { style: 'percent', maximumFractionDigits: 0 }).format(
    ratio,
  );
}

/** Milisegundos como segundos con un decimal: «12,4 s» en español, «12.4 sec» en inglés. */
export function formatSeconds(milliseconds: number, language: string): string {
  return new Intl.NumberFormat(language, {
    style: 'unit',
    unit: 'second',
    unitDisplay: 'short',
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  }).format(milliseconds / 1000);
}
