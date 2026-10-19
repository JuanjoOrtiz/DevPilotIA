import { healthResponseSchema, type SessionResponse } from '@devpilot/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ApiError,
  apiDownload,
  apiRequest,
  onSessionExpired,
  renewSession,
  resetApiClient,
  setAccessToken,
} from './apiClient';

const session: SessionResponse = {
  accessToken: 'new-token',
  expiresIn: 900,
  user: {
    id: '7b0a8a5e-1111-4222-8333-444455556666',
    name: 'Lucía Ferrer',
    email: 'lucia@example.com',
    createdAt: '2026-10-11T10:00:00.000Z',
  },
};
const health = { status: 'ok', database: 'up', version: 'test' };

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const unauthorized = () =>
  json(401, {
    error: { code: 'UNAUTHORIZED', message: 'Authentication is required', details: {} },
  });

const fetchMock = vi.fn<typeof fetch>();

/** Cabecera Authorization de la llamada número `call` a fetch. */
function authorization(call: number): string | null {
  const init = fetchMock.mock.calls[call]?.[1];
  return new Headers(init?.headers).get('Authorization');
}

const url = (call: number) => fetchMock.mock.calls[call]?.[0];

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
  resetApiClient();
});

describe('apiRequest', () => {
  it('sends the access token and validates the response', async () => {
    setAccessToken('token-1');
    fetchMock.mockResolvedValueOnce(json(200, health));

    const result = await apiRequest('/health', { schema: healthResponseSchema });

    expect(result).toEqual(health);
    expect(url(0)).toBe('/api/v1/health');
    expect(authorization(0)).toBe('Bearer token-1');
  });

  it('sends a JSON body with its content type', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

    await apiRequest('/auth/logout', { method: 'POST', body: { a: 1 } });

    const init = fetchMock.mock.calls[0]?.[1];
    expect(init?.method).toBe('POST');
    expect(init?.body).toBe('{"a":1}');
    expect(new Headers(init?.headers).get('Content-Type')).toBe('application/json');
  });

  it('turns an API error into an ApiError with its code and details', async () => {
    const details = { fields: { email: ['EMAIL_INVALID'] } };
    fetchMock.mockResolvedValueOnce(
      json(400, { error: { code: 'VALIDATION_ERROR', message: 'x', details } }),
    );

    const error = await apiRequest('/auth/register', { method: 'POST', body: {} }).catch(
      (reason: unknown) => reason,
    );

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ code: 'VALIDATION_ERROR', status: 400, details });
  });

  it('reports a network failure and an unreadable response with their own codes', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    fetchMock.mockResolvedValueOnce(new Response('<html>Bad gateway</html>', { status: 502 }));
    fetchMock.mockResolvedValueOnce(json(200, { unexpected: true }));

    await expect(apiRequest('/health')).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
    await expect(apiRequest('/health')).rejects.toMatchObject({
      code: 'UNEXPECTED_RESPONSE',
      status: 502,
    });
    await expect(apiRequest('/health', { schema: healthResponseSchema })).rejects.toMatchObject({
      code: 'UNEXPECTED_RESPONSE',
    });
  });

  // RF-AUT-03: la renovación es transparente para quien hace la petición.
  it('renews an expired session and repeats the request with the new token', async () => {
    setAccessToken('expired-token');
    fetchMock
      .mockResolvedValueOnce(unauthorized())
      .mockResolvedValueOnce(json(200, session))
      .mockResolvedValueOnce(json(200, health));

    const result = await apiRequest('/health', { schema: healthResponseSchema });

    expect(result).toEqual(health);
    expect(fetchMock.mock.calls.map((call) => call[0])).toEqual([
      '/api/v1/health',
      '/api/v1/auth/refresh',
      '/api/v1/health',
    ]);
    expect(authorization(2)).toBe('Bearer new-token');
  });

  it('gives up and announces it when the session cannot be renewed', async () => {
    const expired = vi.fn();
    onSessionExpired(expired);
    setAccessToken('expired-token');
    fetchMock.mockResolvedValueOnce(unauthorized()).mockResolvedValueOnce(unauthorized());

    await expect(apiRequest('/health')).rejects.toMatchObject({ code: 'UNAUTHORIZED' });

    expect(expired).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not try to renew when there was no session, as in a failed login', async () => {
    fetchMock.mockResolvedValueOnce(
      json(401, { error: { code: 'INVALID_CREDENTIALS', message: 'x', details: {} } }),
    );

    await expect(apiRequest('/auth/login', { method: 'POST', body: {} })).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
    });
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});

describe('apiDownload', () => {
  const markdown = (headers: Record<string, string>) =>
    new Response('# Título\n', { status: 200, headers });

  it('returns the file with the name the API proposes', async () => {
    setAccessToken('token');
    fetchMock.mockResolvedValueOnce(
      markdown({
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': 'attachment; filename="titulo.md"',
      }),
    );

    const file = await apiDownload('/generations/1/export', 'specification.md');

    expect(file.fileName).toBe('titulo.md');
    expect(await file.content.text()).toBe('# Título\n');
    expect(authorization(0)).toBe('Bearer token');
  });

  it('falls back to the given name without Content-Disposition', async () => {
    fetchMock.mockResolvedValueOnce(markdown({ 'Content-Type': 'text/markdown' }));

    const file = await apiDownload('/generations/1/export', 'specification.md');

    expect(file.fileName).toBe('specification.md');
  });

  it('turns an API error into an ApiError', async () => {
    fetchMock.mockResolvedValueOnce(
      json(409, {
        error: { code: 'SPECIFICATION_NOT_READY', message: 'Not ready', details: {} },
      }),
    );

    await expect(apiDownload('/generations/1/export', 'x.md')).rejects.toMatchObject({
      code: 'SPECIFICATION_NOT_READY',
      status: 409,
    });
  });
});

describe('renewSession', () => {
  it('returns the session and keeps the new access token', async () => {
    fetchMock.mockResolvedValueOnce(json(200, session)).mockResolvedValueOnce(json(200, health));

    expect(await renewSession()).toEqual(session);

    await apiRequest('/health');
    expect(authorization(1)).toBe('Bearer new-token');
  });

  it('returns null when there is no session to renew', async () => {
    fetchMock.mockResolvedValueOnce(unauthorized());

    expect(await renewSession()).toBeNull();
  });

  it('returns null when the API answers 204 because there is no cookie', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

    expect(await renewSession()).toBeNull();
  });

  // Cada refresh token vale una sola vez: dos renovaciones a la vez cerrarían la sesión.
  it('shares one request among simultaneous renewals', async () => {
    fetchMock.mockResolvedValue(json(200, session));

    const results = await Promise.all([renewSession(), renewSession(), renewSession()]);

    expect(results).toEqual([session, session, session]);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('sends several expired requests through a single renewal', async () => {
    setAccessToken('expired-token');
    fetchMock.mockImplementation((input, init) => {
      if (input === '/api/v1/auth/refresh') return Promise.resolve(json(200, session));
      const token = new Headers(init?.headers).get('Authorization');
      return Promise.resolve(token === 'Bearer new-token' ? json(200, health) : unauthorized());
    });

    await Promise.all([apiRequest('/health'), apiRequest('/health'), apiRequest('/health')]);

    const refreshes = fetchMock.mock.calls.filter((call) => call[0] === '/api/v1/auth/refresh');
    expect(refreshes).toHaveLength(1);
  });

  it('uses a browser lock so that two tabs never renew at once', async () => {
    const request = vi.fn((_name: string, task: () => Promise<unknown>) => task());
    vi.stubGlobal('navigator', { locks: { request } });
    fetchMock.mockResolvedValueOnce(json(200, session));

    await renewSession();

    expect(request).toHaveBeenCalledWith('devpilot-session-renewal', expect.any(Function));
  });
});
