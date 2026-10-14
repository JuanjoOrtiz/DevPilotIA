import { describe, expect, it } from 'vitest';
import {
  formatDate,
  formatDateTime,
  formatLongDay,
  formatPercent,
  formatSeconds,
  formatShortDay,
} from './format';

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

describe('dashboard formats', () => {
  it('keeps a server day on the same day whatever the reader time zone', () => {
    expect(formatShortDay('2026-10-01', 'es')).toBe('1 oct');
    expect(formatShortDay('2026-10-01', 'en')).toBe('Oct 1');
    expect(formatLongDay('2026-10-01', 'es')).toBe('1 de octubre de 2026');
    expect(formatLongDay('2026-10-01', 'en')).toBe('October 1, 2026');
  });

  it('writes rates as percentages and durations as seconds with one decimal', () => {
    expect(formatPercent(0.88, 'es')).toMatch(/^88\s%$/);
    expect(formatPercent(0.88, 'en')).toBe('88%');
    expect(formatSeconds(12_400, 'es')).toMatch(/^12,4\ss$/);
    expect(formatSeconds(12_400, 'en')).toMatch(/^12\.4\ssec$/);
  });
});
