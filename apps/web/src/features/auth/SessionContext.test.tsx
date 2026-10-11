import type { SessionResponse } from '@devpilot/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest, resetApiClient } from '../../services/apiClient';
import { lucia } from '../../test/renderApp';
import { SessionProvider, useSession } from './SessionContext';

const session: SessionResponse = {
  accessToken: 'secret-access-token',
  expiresIn: 900,
  user: lucia,
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const unauthorized = () =>
  json(401, {
    error: { code: 'UNAUTHORIZED', message: 'Authentication is required', details: {} },
  });

const fetchMock = vi.fn<typeof fetch>();
let current: ReturnType<typeof useSession>;

function Probe() {
  current = useSession();
  return (
    <p>{`${current.session.status}:${current.session.user?.name ?? ''}:${String(current.expired)}`}</p>
  );
}

function renderSession() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <SessionProvider>
        <Probe />
      </SessionProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  fetchMock.mockReset();
  resetApiClient();
});

describe('SessionProvider', () => {
  it('starts without a session when the browser has no refresh cookie', async () => {
    fetchMock.mockResolvedValueOnce(unauthorized());

    renderSession();

    expect(screen.getByText('loading::false')).toBeTruthy();
    expect(await screen.findByText('anonymous::false')).toBeTruthy();
  });

  it('treats an unreachable API as no session instead of waiting forever', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    renderSession();

    expect(await screen.findByText('anonymous::false')).toBeTruthy();
  });

  // RF-AUT-03 y T-24: el access token vive solo en memoria.
  it('keeps the access token out of every browser storage', async () => {
    fetchMock.mockResolvedValueOnce(unauthorized()).mockResolvedValueOnce(json(200, session));
    renderSession();
    await screen.findByText('anonymous::false');

    await act(() => current.login({ email: lucia.email, password: 'correct horse battery' }));

    expect(await screen.findByText('authenticated:Lucía Ferrer:false')).toBeTruthy();
    const stored = JSON.stringify([{ ...window.localStorage }, { ...window.sessionStorage }]);
    expect(stored).not.toContain('secret-access-token');
    expect(document.cookie).not.toContain('secret-access-token');
  });

  it('closes the session and says it expired when it can no longer be renewed', async () => {
    fetchMock.mockResolvedValueOnce(json(200, session));
    renderSession();
    await screen.findByText('authenticated:Lucía Ferrer:false');

    fetchMock.mockResolvedValueOnce(unauthorized()).mockResolvedValueOnce(unauthorized());
    await act(() => apiRequest('/auth/me').catch(() => undefined));

    expect(await screen.findByText('anonymous::true')).toBeTruthy();
  });

  it('forgets the access token when the user signs out', async () => {
    fetchMock
      .mockResolvedValueOnce(json(200, session))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(unauthorized());
    renderSession();
    await screen.findByText('authenticated:Lucía Ferrer:false');

    await act(() => current.logout());
    await apiRequest('/auth/me').catch(() => undefined);

    expect(screen.getByText('anonymous::false')).toBeTruthy();
    expect(new Headers(fetchMock.mock.calls[1]?.[1]?.headers).get('Authorization')).toBe(
      'Bearer secret-access-token',
    );
    expect(new Headers(fetchMock.mock.calls[2]?.[1]?.headers).get('Authorization')).toBeNull();
  });
});
