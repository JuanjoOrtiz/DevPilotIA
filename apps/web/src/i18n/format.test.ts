import { describe, expect, it } from 'vitest';
import { formatDate, formatDateTime } from './format';

const MORNING = '2026-10-10T07:42:00.000Z';

// RNF-14: las fechas siguen el formato del idioma activo.
describe('date formats', () => {
  it('writes a date the way each language does', () => {
    expect(formatDate(MORNING, 'es', 'UTC')).toBe('10 oct 2026');
    expect(formatDate(MORNING, 'en', 'UTC')).toBe('Oct 10, 2026');
  });

  it('adds the time, in the time zone of the reader', () => {
    expect(formatDateTime(MORNING, 'es', 'Europe/Madrid')).toBe('10 oct 2026, 09:42');
    expect(formatDateTime(MORNING, 'es', 'UTC')).toBe('10 oct 2026, 07:42');
    expect(formatDateTime(MORNING, 'en', 'UTC')).toMatch(/^Oct 10, 2026, 07:42\sAM$/);
  });
});
