import { apiErrorSchema, healthResponseSchema } from '@devpilot/shared';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DomainError } from '../../domain/errors/DomainError.js';
import { lucia } from '../../test-support/authFixture.js';
import { createTestApp } from '../../test-support/testApp.js';

function appWithDatabase(isReachable: () => Promise<boolean>) {
  return createTestApp({ databaseReachable: isReachable }).app;
}

const healthyApp = () => createTestApp().app;

afterEach(() => {
  vi.restoreAllMocks();
});

describe('GET /api/v1/health', () => {
  it('responds 200 when the database is up', async () => {
    const response = await request(healthyApp()).get('/api/v1/health');

    expect(response.status).toBe(200);
    expect(healthResponseSchema.parse(response.body)).toEqual({
      status: 'ok',
      database: 'up',
      version: 'test',
    });
  });

  it('responds 503 when the database is down', async () => {
    const response = await request(appWithDatabase(() => Promise.resolve(false))).get(
      '/api/v1/health',
    );

    expect(response.status).toBe(503);
    expect(healthResponseSchema.parse(response.body).database).toBe('down');
  });
});

describe('error handling', () => {
  it('answers an unknown route with the shared error format', async () => {
    const { app, auth } = createTestApp();
    const session = await auth.registerUser.execute(lucia);

    const insideTheApi = await request(app)
      .get('/api/v1/does-not-exist')
      .set('Authorization', `Bearer ${session.accessToken}`);
    const outsideTheApi = await request(app).get('/does-not-exist');

    expect(insideTheApi.status).toBe(404);
    expect(apiErrorSchema.parse(insideTheApi.body).error.code).toBe('NOT_FOUND');
    expect(outsideTheApi.status).toBe(404);
    expect(apiErrorSchema.parse(outsideTheApi.body).error.code).toBe('NOT_FOUND');
  });

  it('maps a domain error to its status and code', async () => {
    const app = appWithDatabase(() =>
      Promise.reject(new DomainError('USER_QUOTA_EXCEEDED', 'Daily limit reached', { limit: 20 })),
    );

    const response = await request(app).get('/api/v1/health');

    expect(response.status).toBe(429);
    expect(apiErrorSchema.parse(response.body).error).toEqual({
      code: 'USER_QUOTA_EXCEEDED',
      message: 'Daily limit reached',
      details: { limit: 20 },
    });
  });

  // SEG-10: un error inesperado no filtra detalles internos.
  it('hides the details of an unexpected error', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const app = appWithDatabase(() =>
      Promise.reject(new Error('connect ECONNREFUSED db.internal:5432')),
    );

    const response = await request(app).get('/api/v1/health');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error', details: {} },
    });
    expect(JSON.stringify(response.body)).not.toContain('ECONNREFUSED');
    expect(log).toHaveBeenCalledOnce();
  });

  // SEG-02: tamaño máximo de petición de 100 KB.
  it('rejects a request body over 100 KB', async () => {
    const response = await request(healthyApp())
      .post('/api/v1/anything')
      .send({ text: 'x'.repeat(101 * 1024) });

    expect(response.status).toBe(413);
    expect(apiErrorSchema.parse(response.body).error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects a body that is not valid JSON', async () => {
    const response = await request(healthyApp())
      .post('/api/v1/anything')
      .set('Content-Type', 'application/json')
      .send('{ not json');

    expect(response.status).toBe(400);
    expect(apiErrorSchema.parse(response.body).error.code).toBe('VALIDATION_ERROR');
  });
});

describe('security headers', () => {
  it('sets the helmet headers and hides the framework', async () => {
    const response = await request(healthyApp()).get('/api/v1/health');

    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-powered-by']).toBeUndefined();
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('forbids caching API responses, errors included', async () => {
    const health = await request(healthyApp()).get('/api/v1/health');
    const missing = await request(healthyApp()).get('/api/v1/does-not-exist');
    const outsideTheApi = await request(healthyApp()).get('/');

    expect(health.headers['cache-control']).toBe('no-store');
    expect(missing.headers['cache-control']).toBe('no-store');
    expect(outsideTheApi.headers['cache-control']).toBe('no-store');
  });
});
