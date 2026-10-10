import { describe, expect, it } from 'vitest';
import { apiErrorSchema, ERROR_CODES } from './errors.js';

describe('apiErrorSchema', () => {
  it('accepts the shared error envelope', () => {
    const parsed = apiErrorSchema.safeParse({
      error: { code: 'NOT_FOUND', message: 'Resource not found', details: {} },
    });

    expect(parsed.success).toBe(true);
  });

  it('rejects a code the frontend cannot translate', () => {
    const parsed = apiErrorSchema.safeParse({
      error: { code: 'SOMETHING_ELSE', message: 'x', details: {} },
    });

    expect(parsed.success).toBe(false);
  });

  it('has no duplicated codes', () => {
    expect(new Set(ERROR_CODES).size).toBe(ERROR_CODES.length);
  });
});
