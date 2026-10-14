import type { ErrorEvent } from '@sentry/react';
import { describe, expect, it } from 'vitest';
import { ApiError } from './apiClient';
import { scrubWebEvent } from './monitoring';

const event = (): ErrorEvent =>
  ({
    type: undefined,
    request: {
      url: 'https://devpilot.test/generations/1?token=abc',
      headers: { Authorization: 'Bearer abc' },
      query_string: 'token=abc',
    },
    user: { id: 'user-1', email: 'lucia@example.com', ip_address: '203.0.113.7' },
    extra: { inputText: 'texto del usuario' },
  }) as ErrorEvent;

// RNF-15 y RNF-16
describe('scrubWebEvent', () => {
  it('keeps only the user id and the URL without its query', () => {
    const scrubbed = scrubWebEvent(event(), { originalException: new Error('boom') });

    expect(scrubbed?.request).toEqual({ url: 'https://devpilot.test/generations/1' });
    expect(scrubbed?.user).toEqual({ id: 'user-1' });
    expect(JSON.stringify(scrubbed)).not.toMatch(/lucia|Bearer|abc|texto/);
  });

  it('drops expected API errors and network failures', () => {
    for (const error of [
      new ApiError('VALIDATION_ERROR', 400),
      new ApiError('UNAUTHORIZED', 401),
      new ApiError('NOT_FOUND', 404),
      new ApiError('USER_QUOTA_EXCEEDED', 429),
      new ApiError('NETWORK_ERROR'),
    ]) {
      expect(scrubWebEvent(event(), { originalException: error })).toBeNull();
    }
  });

  it('sends server errors', () => {
    expect(
      scrubWebEvent(event(), { originalException: new ApiError('INTERNAL_ERROR', 500) }),
    ).not.toBeNull();
  });
});
