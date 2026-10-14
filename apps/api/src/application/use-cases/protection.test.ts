import { describe, expect, it } from 'vitest';
import { DomainError } from '../../domain/errors/DomainError.js';
import { createAuthFixture, lucia } from '../../test-support/authFixture.js';

async function rejection(action: Promise<unknown>): Promise<DomainError> {
  const error: unknown = await action.then(
    () => undefined,
    (reason: unknown) => reason,
  );
  if (!(error instanceof DomainError)) throw new Error('Expected a DomainError');
  return error;
}

const IP = '203.0.113.7';
const wrong = { email: lucia.email, password: 'not the password' };
const MINUTE = 60 * 1000;

async function failLogins(auth: ReturnType<typeof createAuthFixture>, times: number, ip = IP) {
  for (let i = 0; i < times; i += 1) {
    await rejection(auth.loginUser.execute(wrong, { ip }));
  }
}

// RNF-04 y SEG-07: límite de intentos en la autenticación.
describe('login attempt limit', () => {
  it('blocks an email after 5 failed logins, even with the right password', async () => {
    const auth = createAuthFixture();
    await auth.registerUser.execute(lucia);
    await failLogins(auth, 5);

    const error = await rejection(auth.loginUser.execute(lucia, { ip: '198.51.100.1' }));

    expect(error.code).toBe('TOO_MANY_ATTEMPTS');
    expect(error.details.retryAfterSeconds).toBe(15 * 60);
  });

  it('lets the email in again when the oldest failure leaves the 15-minute window', async () => {
    const auth = createAuthFixture();
    await auth.registerUser.execute(lucia);
    await failLogins(auth, 5);

    auth.clock.advance(10 * MINUTE);
    expect((await rejection(auth.loginUser.execute(lucia, { ip: IP }))).details).toEqual({
      retryAfterSeconds: 5 * 60,
    });

    auth.clock.advance(5 * MINUTE + 1);
    expect((await auth.loginUser.execute(lucia, { ip: IP })).user.email).toBe(lucia.email);
  });

  it('starts again from zero for an email after a correct login', async () => {
    const auth = createAuthFixture();
    await auth.registerUser.execute(lucia);
    await failLogins(auth, 4);

    await auth.loginUser.execute(lucia, { ip: IP });
    await failLogins(auth, 4);

    expect((await auth.loginUser.execute(lucia, { ip: IP })).user.email).toBe(lucia.email);
  });

  it('blocks an IP after 20 failed logins, whatever the email', async () => {
    const auth = createAuthFixture();
    for (let i = 0; i < 20; i += 1) {
      await rejection(
        auth.loginUser.execute({ email: `person${i}@example.com`, password: 'x' }, { ip: IP }),
      );
    }

    const error = await rejection(
      auth.loginUser.execute({ email: 'another@example.com', password: 'x' }, { ip: IP }),
    );

    expect(error.code).toBe('TOO_MANY_ATTEMPTS');
  });

  it('counts by email and by IP, never by password', async () => {
    const auth = createAuthFixture();
    await failLogins(auth, 1);

    expect(auth.attempts.attempts.map((attempt) => attempt.key).toSorted()).toEqual([
      `email:${lucia.email}`,
      `ip:${IP}`,
    ]);
  });
});

describe('registration limit', () => {
  it('allows 10 registrations per IP and hour', async () => {
    const auth = createAuthFixture();
    for (let i = 0; i < 10; i += 1) {
      await auth.registerUser.execute({ ...lucia, email: `user${i}@example.com` }, { ip: IP });
    }

    const error = await rejection(
      auth.registerUser.execute({ ...lucia, email: 'eleventh@example.com' }, { ip: IP }),
    );

    expect(error.code).toBe('TOO_MANY_ATTEMPTS');
    auth.clock.advance(60 * MINUTE + 1);
    await auth.registerUser.execute({ ...lucia, email: 'later@example.com' }, { ip: IP });
  });
});

// SEG-09
describe('security events', () => {
  it('records a failed login with its IP and, if the account exists, its user', async () => {
    const auth = createAuthFixture();
    const { user } = await auth.registerUser.execute(lucia);

    await rejection(auth.loginUser.execute(wrong, { ip: IP }));
    await rejection(auth.loginUser.execute({ ...wrong, email: 'nobody@example.com' }, { ip: IP }));

    expect(auth.securityLog.events).toEqual([
      { type: 'login_failed', userId: user.id, ip: IP },
      { type: 'login_failed', userId: null, ip: IP },
    ]);
  });

  it('records the reuse of a refresh token', async () => {
    const auth = createAuthFixture();
    const session = await auth.registerUser.execute(lucia);
    await auth.refreshSession.execute(session.refreshToken, IP);

    await rejection(auth.refreshSession.execute(session.refreshToken, IP));

    expect(auth.securityLog.events).toContainEqual({
      type: 'refresh_token_reuse',
      userId: session.user.id,
      ip: IP,
    });
  });

  it('records a limit being reached', async () => {
    const auth = createAuthFixture();
    await failLogins(auth, 5);

    await rejection(auth.loginUser.execute(wrong, { ip: IP }));

    expect(auth.securityLog.events.at(-1)).toEqual({
      type: 'limit_reached',
      ip: IP,
      detail: 'login:email',
    });
  });
});
