import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { DomainError } from '../../domain/errors/DomainError.js';
import { createErrorHandler } from './errorHandler.js';

function appThrowing(error: unknown) {
  const reporter = { captureException: vi.fn(), captureMessage: vi.fn() };
  const app = express();
  app.get('/boom/:id', () => {
    throw error;
  });
  app.use(createErrorHandler(reporter));
  return { app, reporter };
}

// RNF-15 y SEG-10
describe('error handler and monitoring', () => {
  it('sends an unexpected error to monitoring and answers a generic 500', async () => {
    const { app, reporter } = appThrowing(new Error('database exploded'));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const response = await request(app).get('/boom/123?q=secret');

    expect(response.status).toBe(500);
    expect(response.text).not.toContain('database exploded');
    expect(reporter.captureException).toHaveBeenCalledWith(expect.any(Error), {
      userId: null,
      route: 'GET /boom/:id',
    });
  });

  it('never sends expected errors: validation, 401, 404 or limits', async () => {
    for (const code of [
      'VALIDATION_ERROR',
      'UNAUTHORIZED',
      'NOT_FOUND',
      'USER_QUOTA_EXCEEDED',
      'TOO_MANY_ATTEMPTS',
    ] as const) {
      const { app, reporter } = appThrowing(new DomainError(code, 'expected'));

      await request(app).get('/boom/1');

      expect(reporter.captureException).not.toHaveBeenCalled();
    }
  });
});
