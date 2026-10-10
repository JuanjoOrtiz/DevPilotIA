import { describe, expect, it } from 'vitest';
import en from './locales/en.json';
import es from './locales/es.json';

function keysOf(value: unknown, prefix = ''): string[] {
  if (typeof value !== 'object' || value === null) return [prefix];
  return Object.entries(value).flatMap(([key, child]) =>
    keysOf(child, prefix ? `${prefix}.${key}` : key),
  );
}

describe('translation files', () => {
  it('have the same keys in every language', () => {
    expect(keysOf(en).sort()).toEqual(keysOf(es).sort());
  });

  it('have no empty texts', () => {
    const texts = [es, en].flatMap((file) => JSON.stringify(file).match(/:\s*""/g) ?? []);

    expect(texts).toEqual([]);
  });
});
