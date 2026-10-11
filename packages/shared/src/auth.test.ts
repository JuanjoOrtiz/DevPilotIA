import { describe, expect, it } from 'vitest';
import { loginRequestSchema, registerRequestSchema, utf8ByteLength } from './auth.js';
import { FIELD_ERRORS } from './validation.js';

const valid = { name: 'Lucía Ferrer', email: 'lucia@example.com', password: 'correct horse' };

function firstError(input: unknown): string | undefined {
  const parsed = registerRequestSchema.safeParse(input);
  return parsed.success ? undefined : parsed.error.issues[0]?.message;
}

describe('registerRequestSchema', () => {
  it('accepts a valid registration and normalises name and email', () => {
    const parsed = registerRequestSchema.parse({
      ...valid,
      name: '  Lucía Ferrer ',
      email: ' Lucia@Example.COM ',
    });

    expect(parsed).toEqual(valid);
  });

  it('explains each invalid field with a code the frontend can translate', () => {
    expect(firstError({ ...valid, name: '   ' })).toBe('NAME_REQUIRED');
    expect(firstError({ ...valid, name: 'x'.repeat(81) })).toBe('NAME_TOO_LONG');
    expect(firstError({ ...valid, email: 'not-an-email' })).toBe('EMAIL_INVALID');
    expect(firstError({ ...valid, password: 'short' })).toBe('PASSWORD_TOO_SHORT');
    expect(firstError({ ...valid, password: undefined })).toBe('PASSWORD_REQUIRED');
  });

  // bcrypt ignora lo que pasa de 72 bytes: dos contraseñas largas distintas valdrían igual.
  it('rejects a password longer than 72 bytes, counting bytes and not characters', () => {
    expect(firstError({ ...valid, password: 'a'.repeat(72) })).toBeUndefined();
    expect(firstError({ ...valid, password: 'a'.repeat(73) })).toBe('PASSWORD_TOO_LONG');
    expect(firstError({ ...valid, password: 'ñ'.repeat(37) })).toBe('PASSWORD_TOO_LONG');
  });

  it('only uses known field error codes', () => {
    const inputs = [{}, { name: 5, email: 5, password: 5 }, { ...valid, email: '' }];
    const messages = inputs.flatMap((input) => {
      const parsed = registerRequestSchema.safeParse(input);
      return parsed.success ? [] : parsed.error.issues.map((issue) => issue.message);
    });

    expect(messages.length).toBeGreaterThan(0);
    expect(messages.filter((message) => !FIELD_ERRORS.includes(message as never))).toEqual([]);
  });
});

describe('loginRequestSchema', () => {
  it('does not apply the registration password rules', () => {
    const parsed = loginRequestSchema.safeParse({ email: 'Lucia@Example.com', password: 'x' });

    expect(parsed.success && parsed.data).toEqual({ email: 'lucia@example.com', password: 'x' });
  });

  it('requires both fields', () => {
    expect(loginRequestSchema.safeParse({ email: 'lucia@example.com' }).success).toBe(false);
    expect(loginRequestSchema.safeParse({ password: 'secret' }).success).toBe(false);
  });
});

describe('utf8ByteLength', () => {
  it('counts the bytes of each kind of character', () => {
    expect(utf8ByteLength('')).toBe(0);
    expect(utf8ByteLength('abc')).toBe(3);
    expect(utf8ByteLength('ñ')).toBe(2);
    expect(utf8ByteLength('€')).toBe(3);
    expect(utf8ByteLength('😀')).toBe(4);
    expect(utf8ByteLength('añ€😀')).toBe(10);
  });
});
