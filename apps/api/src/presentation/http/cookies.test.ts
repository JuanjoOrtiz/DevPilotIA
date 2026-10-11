import { describe, expect, it } from 'vitest';
import { readCookie } from './cookies.js';

describe('readCookie', () => {
  it('finds a cookie among several', () => {
    expect(
      readCookie('theme=dark; devpilot_refresh=abc.def.ghi; lang=es', 'devpilot_refresh'),
    ).toBe('abc.def.ghi');
  });

  it('decodes the value and keeps any = inside it', () => {
    expect(readCookie('token=a%20b%3Dc', 'token')).toBe('a b=c');
    expect(readCookie('token=abc==', 'token')).toBe('abc==');
  });

  it('returns nothing when the cookie is missing', () => {
    expect(readCookie(undefined, 'token')).toBeUndefined();
    expect(readCookie('', 'token')).toBeUndefined();
    expect(readCookie('other=1; malformed', 'token')).toBeUndefined();
  });

  it('does not confuse a cookie with another whose name merely ends the same', () => {
    expect(readCookie('xtoken=1', 'token')).toBeUndefined();
  });

  it('ignores a value that is not validly encoded', () => {
    expect(readCookie('token=%E0%A4%A', 'token')).toBeUndefined();
  });
});
