import { ERROR_CODES, FIELD_ERRORS } from '@devpilot/shared';
import { describe, expect, it } from 'vitest';
import en from './locales/en.json';
import es from './locales/es.json';
import { errorMessageKey, fieldMessageKey } from './messages';

describe('error messages', () => {
  // packages/shared avisa: añadir un código obliga a añadir su texto.
  it('have a text in every language for every error code of the API', () => {
    for (const code of [...ERROR_CODES, 'NETWORK_ERROR', 'UNEXPECTED_RESPONSE']) {
      expect(es.errors, code).toHaveProperty(code);
      expect(en.errors, code).toHaveProperty(code);
    }
  });

  it('have a text in every language for every field error', () => {
    for (const reason of [...FIELD_ERRORS, 'EMAIL_ALREADY_REGISTERED', 'INVALID']) {
      expect(es.validation, reason).toHaveProperty(reason);
      expect(en.validation, reason).toHaveProperty(reason);
    }
  });

  it('never show a raw code for something the frontend does not know yet', () => {
    expect(fieldMessageKey('PASSWORD_TOO_SHORT')).toBe('validation.PASSWORD_TOO_SHORT');
    expect(fieldMessageKey('SOMETHING_NEW')).toBe('validation.INVALID');
    expect(fieldMessageKey(undefined)).toBe('validation.INVALID');
    expect(errorMessageKey('INVALID_CREDENTIALS')).toBe('errors.INVALID_CREDENTIALS');
    expect(errorMessageKey('SOMETHING_NEW')).toBe('errors.INTERNAL_ERROR');
  });
});
