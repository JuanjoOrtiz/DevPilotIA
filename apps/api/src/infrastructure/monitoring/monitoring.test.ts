import type { ErrorEvent } from '@sentry/node';
import { describe, expect, it, vi } from 'vitest';
import { FixedClock } from '../../test-support/fakes.js';
import { ConsoleSecurityLog } from './ConsoleSecurityLog.js';
import { keepBreadcrumb, scrubEvent } from './SentryErrorReporter.js';

// SEG-09
describe('ConsoleSecurityLog', () => {
  it('writes one JSON line per event with date, user and IP', () => {
    const lines: string[] = [];
    const log = new ConsoleSecurityLog(new FixedClock(), undefined, (line) => lines.push(line));

    log.record({ type: 'login_failed', userId: null, ip: '203.0.113.7' });
    log.record({ type: 'access_denied', ip: '203.0.113.7', detail: 'GET /projects' });

    expect(lines.map((line) => JSON.parse(line) as unknown)).toEqual([
      {
        kind: 'security',
        event: 'login_failed',
        at: '2026-10-11T10:00:00.000Z',
        userId: null,
        ip: '203.0.113.7',
      },
      {
        kind: 'security',
        event: 'access_denied',
        at: '2026-10-11T10:00:00.000Z',
        userId: null,
        ip: '203.0.113.7',
        detail: 'GET /projects',
      },
    ]);
  });

  it('alerts Sentry when a refresh token is reused or logins are locked', () => {
    const reporter = { captureException: vi.fn(), captureMessage: vi.fn() };
    const log = new ConsoleSecurityLog(new FixedClock(), reporter, () => undefined);

    log.record({ type: 'login_failed', userId: 'user-1' });
    log.record({ type: 'access_denied', detail: 'GET /projects' });
    log.record({ type: 'limit_reached', detail: 'generations:user' });
    log.record({ type: 'refresh_token_reuse', userId: 'user-1' });
    log.record({ type: 'limit_reached', ip: '203.0.113.7', detail: 'login:ip' });

    expect(reporter.captureMessage.mock.calls).toEqual([
      ['Refresh token reuse', { userId: 'user-1' }],
      // Sin la IP: a Sentry solo llega qué límite saltó.
      ['Login attempts limit reached', { detail: 'login:ip' }],
    ]);
  });
});

// RNF-16
describe('Sentry privacy', () => {
  it('removes the body, headers, cookies, query and every user field but the id', () => {
    const event = {
      type: undefined,
      request: {
        url: 'https://api.test/api/v1/auth/login?email=lucia@example.com',
        data: '{"email":"lucia@example.com","password":"secret"}',
        headers: { authorization: 'Bearer token', cookie: 'devpilot_refresh=x' },
        cookies: { devpilot_refresh: 'x' },
        query_string: 'email=lucia@example.com',
      },
      user: { id: 'user-1', email: 'lucia@example.com', ip_address: '203.0.113.7' },
      extra: { inputText: 'texto del usuario' },
    } as ErrorEvent;

    const scrubbed = scrubEvent(event);

    expect(scrubbed.request).toEqual({ url: 'https://api.test/api/v1/auth/login' });
    expect(scrubbed.user).toEqual({ id: 'user-1' });
    expect(scrubbed.extra).toBeUndefined();
    expect(JSON.stringify(scrubbed)).not.toMatch(/lucia|secret|Bearer|texto/);
  });

  it('drops console breadcrumbs, which may carry request data', () => {
    expect(keepBreadcrumb({ category: 'console', message: 'Generation failed' })).toBeNull();
    expect(keepBreadcrumb({ category: 'http', message: 'GET /x' })).toEqual({
      category: 'http',
      message: 'GET /x',
    });
  });
});
