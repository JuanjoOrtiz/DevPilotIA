import { describe, expect, it } from 'vitest';
import { excerpt } from './GenerationDto.js';

describe('excerpt', () => {
  it('returns a short text as it is, on a single line', () => {
    expect(excerpt('  Exportar pedidos\n\n a  CSV ')).toBe('Exportar pedidos a CSV');
    expect(excerpt('')).toBe('');
  });

  it('cuts a long text and marks that there is more', () => {
    expect(excerpt('abcdefghij', 4)).toBe('abcd…');
    expect(excerpt('abcd', 4)).toBe('abcd');
    expect(excerpt('abc defghi', 4)).toBe('abc…');
  });

  it('never splits a character in two', () => {
    expect(excerpt('😀😀😀😀', 2)).toBe('😀😀…');
  });
});
