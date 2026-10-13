import { describe, expect, it } from 'vitest';
import { ApiError } from '../../services/apiClient';
import { rejectedFields, toSubmitFailure } from './submitFailure';

describe('toSubmitFailure', () => {
  it('keeps the code of the API and the reason of each field', () => {
    const error = new ApiError('VALIDATION_ERROR', 400, {
      fields: { name: ['PROJECT_NAME_REQUIRED'] },
    });

    expect(toSubmitFailure(error)).toEqual({
      code: 'VALIDATION_ERROR',
      fields: { name: ['PROJECT_NAME_REQUIRED'] },
      details: { fields: { name: ['PROJECT_NAME_REQUIRED'] } },
    });
  });

  it('keeps the rest of the details, like when a limit resets', () => {
    const error = new ApiError('USER_QUOTA_EXCEEDED', 429, {
      limit: 20,
      resetsAt: '2026-10-13T00:00:00.000Z',
    });

    expect(toSubmitFailure(error).details).toEqual({
      limit: 20,
      resetsAt: '2026-10-13T00:00:00.000Z',
    });
  });

  it('treats anything that is not an API error as an internal error', () => {
    expect(toSubmitFailure(new TypeError('boom'))).toEqual({ code: 'INTERNAL_ERROR', fields: {} });
    expect(toSubmitFailure(new ApiError('NETWORK_ERROR')).fields).toEqual({});
  });
});

describe('rejectedFields', () => {
  it('gives the first reason of each field of the form and ignores the rest', () => {
    const failure = {
      code: 'VALIDATION_ERROR' as const,
      fields: {
        name: ['PROJECT_NAME_TOO_LONG', 'OTHER'],
        'techStack.3': ['TAG_TOO_LONG'],
        unknown: ['WHATEVER'],
      },
    };

    expect(rejectedFields(failure, ['name', 'description', 'techStack'])).toEqual([
      { field: 'name', reason: 'PROJECT_NAME_TOO_LONG' },
      { field: 'techStack', reason: 'TAG_TOO_LONG' },
    ]);
  });
});
