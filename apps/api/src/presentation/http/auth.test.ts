import { apiErrorSchema, sessionResponseSchema } from '@devpilot/shared';
import request, { type Response } from 'supertest';
import { describe, expect, it } from 'vitest';
import { lucia } from '../../test-support/authFixture.js';
import { REFRESH_TOKEN_MS } from '../../test-support/fakes.js';
import { createTestApp } from '../../test-support/testApp.js';
import { PUBLIC_ROUTES } from './app.js';

/** La cabecera Set-Cookie de la cookie de refresh, tal cual la envía la API. */
function refreshCookie(response: Response): string {
  const header = response.headers['set-cookie'] as string[] | string | undefined;
  const cookies = Array.isArray(header) ? header : header ? [header] : [];
  const cookie = cookies.find((candidate) => candidate.startsWith('devpilot_refresh='));
  if (!cookie) throw new Error('The response did not set the refresh cookie');
  return cookie;
}

/** Lo que el navegador enviaría de vuelta: solo `nombre=valor`. */
const cookiePair = (response: Response) => refreshCookie(response).split(';')[0] ?? '';

const errorCode = (response: Response) => apiErrorSchema.parse(response.body).error.code;

describe('POST /api/v1/auth/register', () => {
  it('creates the account and answers with the session', async () => {
    const { app } = createTestApp();

    const response = await request(app).post('/api/v1/auth/register').send(lucia);

    expect(response.status).toBe(201);
    const session = sessionResponseSchema.parse(response.body);
    expect(session.user).toMatchObject({ name: 'Lucía Ferrer', email: 'lucia@example.com' });
    expect(session.expiresIn).toBe(900);
  });

  // RF-AUT-03 y T-24: el refresh token solo viaja en una cookie que JavaScript no puede leer.
  it('sends the refresh token only in an httpOnly, SameSite=Strict cookie', async () => {
    const { app, auth } = createTestApp();

    const response = await request(app).post('/api/v1/auth/register').send(lucia);

    const cookie = refreshCookie(response);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Strict');
    expect(cookie).toContain('Path=/api/v1/auth');
    expect(cookie).toContain(
      `Expires=${new Date(auth.clock.now().getTime() + REFRESH_TOKEN_MS).toUTCString()}`,
    );
    expect(cookie).not.toContain('Secure');
    expect(JSON.stringify(response.body)).not.toContain('refresh-');
    expect(Object.keys(response.body as object).sort()).toEqual([
      'accessToken',
      'expiresIn',
      'user',
    ]);
  });

  it('marks the cookie as Secure in production', async () => {
    const { app } = createTestApp({ secureCookies: true });

    const response = await request(app).post('/api/v1/auth/register').send(lucia);

    expect(refreshCookie(response)).toContain('Secure');
  });

  it('never returns the password or its hash', async () => {
    const { app } = createTestApp();

    const response = await request(app).post('/api/v1/auth/register').send(lucia);

    expect(JSON.stringify(response.body)).not.toContain(lucia.password);
    expect(response.body).not.toHaveProperty('user.passwordHash');
  });

  // RF-AUT-01: errores por campo.
  it('explains which fields are invalid', async () => {
    const { app, auth } = createTestApp();

    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: ' ', email: 'not-an-email', password: 'short' });

    expect(response.status).toBe(400);
    expect(apiErrorSchema.parse(response.body).error).toMatchObject({
      code: 'VALIDATION_ERROR',
      details: {
        fields: {
          name: ['NAME_REQUIRED'],
          email: ['EMAIL_INVALID'],
          password: ['PASSWORD_TOO_SHORT'],
        },
      },
    });
    expect(auth.users.users).toHaveLength(0);
  });

  it('rejects a request without a body', async () => {
    const { app } = createTestApp();

    const response = await request(app).post('/api/v1/auth/register');

    expect(response.status).toBe(400);
    expect(errorCode(response)).toBe('VALIDATION_ERROR');
  });

  it('answers 409 when the email already has an account, whatever its case', async () => {
    const { app } = createTestApp();
    await request(app).post('/api/v1/auth/register').send(lucia);

    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...lucia, email: 'LUCIA@example.com' });

    expect(response.status).toBe(409);
    expect(errorCode(response)).toBe('EMAIL_ALREADY_REGISTERED');
    expect(response.headers['set-cookie']).toBeUndefined();
  });

  it('ignores fields the API does not expect', async () => {
    const { app, auth } = createTestApp();

    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...lucia, id: 'chosen-by-the-client', passwordHash: 'x', role: 'admin' });

    expect(response.status).toBe(201);
    expect(auth.users.users[0]?.id).not.toBe('chosen-by-the-client');
    expect(auth.users.users[0]).not.toHaveProperty('role');
  });
});

describe('POST /api/v1/auth/login', () => {
  it('starts a session with the right credentials', async () => {
    const { app } = createTestApp();
    await request(app).post('/api/v1/auth/register').send(lucia);

    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: ' Lucia@Example.com ', password: lucia.password });

    expect(response.status).toBe(200);
    expect(sessionResponseSchema.parse(response.body).user.email).toBe('lucia@example.com');
    expect(refreshCookie(response)).toContain('HttpOnly');
  });

  // RF-AUT-02: la respuesta no revela si el email existe.
  it('answers exactly the same for a wrong password and for an unknown email', async () => {
    const { app } = createTestApp();
    await request(app).post('/api/v1/auth/register').send(lucia);

    const wrongPassword = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: lucia.email, password: 'not the password' });
    const unknownEmail = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'nobody@example.com', password: lucia.password });

    expect(wrongPassword.status).toBe(401);
    expect(errorCode(wrongPassword)).toBe('INVALID_CREDENTIALS');
    expect(unknownEmail.status).toBe(wrongPassword.status);
    expect(unknownEmail.body).toEqual(wrongPassword.body);
    expect(wrongPassword.headers['set-cookie']).toBeUndefined();
  });
});

describe('GET /api/v1/auth/me', () => {
  it('returns the user of the access token', async () => {
    const { app } = createTestApp();
    const registered = await request(app).post('/api/v1/auth/register').send(lucia);
    const { accessToken, user } = sessionResponseSchema.parse(registered.body);

    const response = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ user });
  });

  it('answers 401 once the access token has expired', async () => {
    const { app, auth } = createTestApp();
    const registered = await request(app).post('/api/v1/auth/register').send(lucia);
    const { accessToken } = sessionResponseSchema.parse(registered.body);

    auth.clock.advance(15 * 60 * 1000);
    const response = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(401);
    expect(errorCode(response)).toBe('UNAUTHORIZED');
  });
});

describe('POST /api/v1/auth/refresh', () => {
  it('renews the session from the cookie and rotates the refresh token', async () => {
    const { app } = createTestApp();
    const registered = await request(app).post('/api/v1/auth/register').send(lucia);

    const response = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', cookiePair(registered));

    expect(response.status).toBe(200);
    const renewed = sessionResponseSchema.parse(response.body);
    expect(renewed.user.email).toBe('lucia@example.com');
    expect(renewed.accessToken).not.toBe(sessionResponseSchema.parse(registered.body).accessToken);
    expect(cookiePair(response)).not.toBe(cookiePair(registered));
  });

  // SEG-07: reutilizar un refresh token ya usado cierra todas las sesiones.
  it('rejects a refresh token that was already used and closes every session', async () => {
    const { app } = createTestApp();
    const registered = await request(app).post('/api/v1/auth/register').send(lucia);
    const renewed = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', cookiePair(registered));

    const reused = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', cookiePair(registered));
    const afterTheft = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', cookiePair(renewed));

    expect(reused.status).toBe(401);
    expect(errorCode(reused)).toBe('UNAUTHORIZED');
    expect(afterTheft.status).toBe(401);
  });

  it('answers 401 and removes the cookie when it is missing or not valid', async () => {
    const { app } = createTestApp();

    const missing = await request(app).post('/api/v1/auth/refresh');
    const invalid = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', 'devpilot_refresh=made-up');

    expect(missing.status).toBe(401);
    expect(invalid.status).toBe(401);
    expect(refreshCookie(invalid)).toMatch(/^devpilot_refresh=;/);
    expect(refreshCookie(invalid)).toContain('Expires=Thu, 01 Jan 1970');
  });

  it('does not accept the refresh token in the Authorization header', async () => {
    const { app, auth } = createTestApp();
    const session = await auth.registerUser.execute(lucia);

    const response = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${session.refreshToken}`);

    expect(response.status).toBe(401);
  });
});

describe('POST /api/v1/auth/logout', () => {
  // RF-AUT-04: el refresh token queda invalidado en el servidor.
  it('invalidates the refresh token and removes the cookie', async () => {
    const { app } = createTestApp();
    const registered = await request(app).post('/api/v1/auth/register').send(lucia);
    const { accessToken } = sessionResponseSchema.parse(registered.body);

    const response = await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Cookie', cookiePair(registered));
    const afterLogout = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', cookiePair(registered));

    expect(response.status).toBe(204);
    expect(refreshCookie(response)).toMatch(/^devpilot_refresh=;/);
    expect(afterLogout.status).toBe(401);
  });

  it('needs an access token', async () => {
    const { app } = createTestApp();
    const registered = await request(app).post('/api/v1/auth/register').send(lucia);

    const response = await request(app)
      .post('/api/v1/auth/logout')
      .set('Cookie', cookiePair(registered));

    expect(response.status).toBe(401);
  });
});

// SEG-15: denegar por defecto.
describe('authentication by default', () => {
  it('answers 401 to a route that is not declared as public', async () => {
    const { app } = createTestApp();

    for (const path of ['/api/v1/auth/me', '/api/v1/projects', '/api/v1/not-written-yet']) {
      const response = await request(app).get(path);

      expect(response.status, path).toBe(401);
      expect(errorCode(response), path).toBe('UNAUTHORIZED');
    }
  });

  it('answers 401 to a public path requested with another method', async () => {
    const { app } = createTestApp();

    expect((await request(app).delete('/api/v1/health')).status).toBe(401);
    expect((await request(app).get('/api/v1/auth/login')).status).toBe(401);
  });

  it('rejects a malformed Authorization header', async () => {
    const { app, auth } = createTestApp();
    const { accessToken } = await auth.registerUser.execute(lucia);

    for (const header of [accessToken, `Basic ${accessToken}`, 'Bearer', 'Bearer made-up']) {
      const response = await request(app).get('/api/v1/auth/me').set('Authorization', header);

      expect(response.status, header).toBe(401);
    }
  });

  it('keeps the list of public routes short and explicit', () => {
    expect(PUBLIC_ROUTES).toEqual([
      { method: 'GET', path: '/health' },
      { method: 'POST', path: '/auth/register' },
      { method: 'POST', path: '/auth/login' },
      { method: 'POST', path: '/auth/refresh' },
    ]);
  });
});

// RNF-04 y SEG-09
describe('authentication protection over HTTP', () => {
  it('answers 429 with Retry-After once an email has failed 5 times', async () => {
    const { app } = createTestApp();
    await request(app).post('/api/v1/auth/register').send(lucia);
    for (let i = 0; i < 5; i += 1) {
      await request(app)
        .post('/api/v1/auth/login')
        .send({ email: lucia.email, password: 'not the password' });
    }

    const response = await request(app).post('/api/v1/auth/login').send(lucia);

    expect(response.status).toBe(429);
    expect(response.headers['retry-after']).toBe('900');
    expect(apiErrorSchema.parse(response.body).error).toMatchObject({
      code: 'TOO_MANY_ATTEMPTS',
      details: { retryAfterSeconds: 900 },
    });
  });

  it('records every request refused for lack of a valid token', async () => {
    const { app, auth } = createTestApp();

    await request(app).get('/api/v1/projects').set('Authorization', 'Bearer forged');

    expect(auth.securityLog.events).toContainEqual(
      expect.objectContaining({ type: 'access_denied', detail: 'GET /projects' }),
    );
  });
});
