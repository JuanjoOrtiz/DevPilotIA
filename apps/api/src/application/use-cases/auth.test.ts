import { describe, expect, it } from 'vitest';
import { DomainError } from '../../domain/errors/DomainError.js';
import { createAuthFixture, lucia } from '../../test-support/authFixture.js';
import { ACCESS_TOKEN_SECONDS, REFRESH_TOKEN_MS } from '../../test-support/fakes.js';

async function codeOf(action: Promise<unknown>): Promise<string> {
  const error: unknown = await action.then(
    () => undefined,
    (reason: unknown) => reason,
  );
  if (!(error instanceof DomainError)) throw new Error('Expected a DomainError');
  return error.code;
}

describe('RegisterUser', () => {
  it('creates the account and leaves the session started', async () => {
    const auth = createAuthFixture();

    const session = await auth.registerUser.execute(lucia);

    expect(session.user).toEqual({
      id: auth.users.users[0]?.id,
      name: 'Lucía Ferrer',
      email: 'lucia@example.com',
      createdAt: '2026-10-11T10:00:00.000Z',
    });
    expect(session.expiresIn).toBe(ACCESS_TOKEN_SECONDS);
    expect(await auth.tokens.verifyAccessToken(session.accessToken)).toEqual({
      userId: session.user.id,
    });
  });

  it('stores a hash of the password, never the password', async () => {
    const auth = createAuthFixture();

    const session = await auth.registerUser.execute(lucia);

    expect(auth.users.users[0]?.passwordHash).toBe(`hashed(${lucia.password})`);
    expect(JSON.stringify(session)).not.toContain(lucia.password);
    expect(JSON.stringify(session)).not.toContain('hashed(');
  });

  it('stores a hash of the refresh token, never the token', async () => {
    const auth = createAuthFixture();

    const session = await auth.registerUser.execute(lucia);

    expect(auth.refreshTokens.tokens).toHaveLength(1);
    expect(auth.refreshTokens.tokens[0]?.tokenHash).toBe(`sha(${session.refreshToken})`);
    expect(auth.refreshTokens.tokens[0]?.expiresAt).toEqual(session.refreshTokenExpiresAt);
  });

  it('rejects an email that already has an account', async () => {
    const auth = createAuthFixture();
    await auth.registerUser.execute(lucia);

    const code = await codeOf(auth.registerUser.execute({ ...lucia, name: 'Otra persona' }));

    expect(code).toBe('EMAIL_ALREADY_REGISTERED');
    expect(auth.users.users).toHaveLength(1);
  });
});

describe('LoginUser', () => {
  it('starts a session with the right credentials', async () => {
    const auth = createAuthFixture();
    const registered = await auth.registerUser.execute(lucia);

    const session = await auth.loginUser.execute({ email: lucia.email, password: lucia.password });

    expect(session.user).toEqual(registered.user);
    expect(session.refreshToken).not.toBe(registered.refreshToken);
    expect(auth.refreshTokens.activeFor(session.user.id)).toHaveLength(2);
  });

  // RF-AUT-02: el mismo error para una contraseña incorrecta y para un email sin cuenta.
  it('answers the same for a wrong password and for an unknown email', async () => {
    const auth = createAuthFixture();
    await auth.registerUser.execute(lucia);

    const wrongPassword = await codeOf(
      auth.loginUser.execute({ email: lucia.email, password: 'not the password' }),
    );
    const unknownEmail = await codeOf(
      auth.loginUser.execute({ email: 'nobody@example.com', password: lucia.password }),
    );

    expect(wrongPassword).toBe('INVALID_CREDENTIALS');
    expect(unknownEmail).toBe('INVALID_CREDENTIALS');
  });

  it('checks a password even when the email is unknown, so timing reveals nothing', async () => {
    const auth = createAuthFixture();

    await codeOf(auth.loginUser.execute({ email: 'nobody@example.com', password: 'whatever' }));

    expect(auth.hasher.verified).toHaveLength(1);
  });
});

describe('RefreshSession', () => {
  it('exchanges the refresh token for a new session and retires the old token', async () => {
    const auth = createAuthFixture();
    const first = await auth.registerUser.execute(lucia);

    const second = await auth.refreshSession.execute(first.refreshToken);

    expect(second.user).toEqual(first.user);
    expect(second.refreshToken).not.toBe(first.refreshToken);
    expect(second.accessToken).not.toBe(first.accessToken);
    expect(auth.refreshTokens.activeFor(first.user.id)).toHaveLength(1);
    expect(auth.refreshTokens.activeFor(first.user.id)[0]?.tokenHash).toBe(
      `sha(${second.refreshToken})`,
    );
  });

  // SEG-07: reutilizar un refresh token ya usado cierra todas las sesiones del usuario.
  it('closes every session of the user when a used token is presented again', async () => {
    const auth = createAuthFixture();
    const first = await auth.registerUser.execute(lucia);
    const otherDevice = await auth.loginUser.execute(lucia);
    const second = await auth.refreshSession.execute(first.refreshToken);

    const code = await codeOf(auth.refreshSession.execute(first.refreshToken));

    expect(code).toBe('UNAUTHORIZED');
    expect(auth.refreshTokens.activeFor(first.user.id)).toHaveLength(0);
    expect(await codeOf(auth.refreshSession.execute(second.refreshToken))).toBe('UNAUTHORIZED');
    expect(await codeOf(auth.refreshSession.execute(otherDevice.refreshToken))).toBe(
      'UNAUTHORIZED',
    );
  });

  it('rejects a missing, unknown or expired token', async () => {
    const auth = createAuthFixture();
    const session = await auth.registerUser.execute(lucia);

    expect(await codeOf(auth.refreshSession.execute(undefined))).toBe('UNAUTHORIZED');
    expect(await codeOf(auth.refreshSession.execute('refresh-999'))).toBe('UNAUTHORIZED');

    auth.clock.advance(REFRESH_TOKEN_MS + 1);
    expect(await codeOf(auth.refreshSession.execute(session.refreshToken))).toBe('UNAUTHORIZED');
  });

  it('rejects an access token used as a refresh token', async () => {
    const auth = createAuthFixture();
    const session = await auth.registerUser.execute(lucia);

    expect(await codeOf(auth.refreshSession.execute(session.accessToken))).toBe('UNAUTHORIZED');
    expect(auth.refreshTokens.activeFor(session.user.id)).toHaveLength(1);
  });

  it('rejects a token whose account no longer exists', async () => {
    const auth = createAuthFixture();
    const session = await auth.registerUser.execute(lucia);
    auth.users.remove(session.user.id);

    expect(await codeOf(auth.refreshSession.execute(session.refreshToken))).toBe('UNAUTHORIZED');
  });
});

describe('LogoutUser', () => {
  // RF-AUT-04: tras cerrar sesión, el refresh token ya no sirve.
  it('invalidates the refresh token on the server', async () => {
    const auth = createAuthFixture();
    const session = await auth.registerUser.execute(lucia);

    await auth.logoutUser.execute(session.user.id, session.refreshToken);

    expect(auth.refreshTokens.activeFor(session.user.id)).toHaveLength(0);
    expect(await codeOf(auth.refreshSession.execute(session.refreshToken))).toBe('UNAUTHORIZED');
  });

  it('leaves the other sessions of the user open', async () => {
    const auth = createAuthFixture();
    const session = await auth.registerUser.execute(lucia);
    const otherDevice = await auth.loginUser.execute(lucia);

    await auth.logoutUser.execute(session.user.id, session.refreshToken);

    expect((await auth.refreshSession.execute(otherDevice.refreshToken)).user).toEqual(
      session.user,
    );
  });

  it('does nothing without a token, with an unknown one or with one of another user', async () => {
    const auth = createAuthFixture();
    const session = await auth.registerUser.execute(lucia);
    const other = await auth.registerUser.execute({ ...lucia, email: 'other@example.com' });

    await auth.logoutUser.execute(session.user.id, undefined);
    await auth.logoutUser.execute(session.user.id, 'refresh-999');
    await auth.logoutUser.execute(other.user.id, session.refreshToken);

    expect(auth.refreshTokens.activeFor(session.user.id)).toHaveLength(1);
  });
});

describe('GetCurrentUser', () => {
  it('returns the user without the password hash', async () => {
    const auth = createAuthFixture();
    const session = await auth.registerUser.execute(lucia);

    const user = await auth.getCurrentUser.execute(session.user.id);

    expect(user).toEqual(session.user);
    expect(user).not.toHaveProperty('passwordHash');
  });

  it('rejects a session whose account no longer exists', async () => {
    const auth = createAuthFixture();

    const code = await codeOf(auth.getCurrentUser.execute('7b0a8a5e-1111-4222-8333-444455556666'));

    expect(code).toBe('UNAUTHORIZED');
  });
});
