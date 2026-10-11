import { describe, expect, it } from 'vitest';
import { ApiError } from './apiClient';
import { shouldRetry } from './queryClient';

describe('shouldRetry', () => {
  it('does not insist on an answer that will not change', () => {
    expect(shouldRetry(0, new ApiError('NOT_FOUND', 404))).toBe(false);
    expect(shouldRetry(0, new ApiError('VALIDATION_ERROR', 400))).toBe(false);
    expect(shouldRetry(0, new ApiError('UNAUTHORIZED', 401))).toBe(false);
  });

  it('retries twice what may be a passing failure', () => {
    for (const error of [new ApiError('NETWORK_ERROR'), new ApiError('INTERNAL_ERROR', 500)]) {
      expect(shouldRetry(0, error)).toBe(true);
      expect(shouldRetry(1, error)).toBe(true);
      expect(shouldRetry(2, error)).toBe(false);
    }
  });
});
