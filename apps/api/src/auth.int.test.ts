import { apiErrorSchema, sessionResponseSchema } from '@devpilot/shared';
import request, { type Response } from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { compose } from './composition.js';
import { BcryptPasswordHasher } from './infrastructure/security/BcryptPasswordHasher.js';
import { testEnv } from './test-support/testEnv.js';

// La API completa contra PostgreSQL: repositorios de Prisma, bcrypt y JWT reales.
// bcrypt con coste mínimo, para que los tests no tarden.
const { app, database } = compose(testEnv(), { passwordHasher: new BcryptPasswordHasher(4) });
const { prisma } = database;

const run = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
let sequence = 0;

/** Una persona distinta en cada test, para que no dependan unos de otros. */
function newPerson() {
  sequence += 1;
  return {
    name: 'Lucía Ferrer',
    email: `auth-${run}-${sequence}@example.test`,
    password: 'correct horse battery',
  };
}

function cookiePair(response: Response): string {
  const header = response.headers['set-cookie'] as string[] | string | undefined;
  const cookies = Array.isArray(header) ? header : header ? [header] : [];
  const cookie = cookies.find((candidate) => candidate.startsWith('devpilot_refresh='));
  if (!cookie) throw new Error('The response did not set the refresh cookie');
  return cookie.split(';')[0] ?? '';
}

const register = (person: ReturnType<typeof newPerson>) =>
  request(app).post('/api/v1/auth/register').send(person);

const refresh = (cookie: string) => request(app).post('/api/v1/auth/refresh').set('Cookie', cookie);

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { startsWith: `auth-${run}-` } } });
  await prisma.$disconnect();
});

describe('authentication against PostgreSQL', () => {
  it('registers, identifies the user, renews the session and logs out', async () => {
    const person = newPerson();

    const registered = await register(person);
    expect(registered.status).toBe(201);
    const session = sessionResponseSchema.parse(registered.body);

    const me = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${session.accessToken}`);
    expect(me.body).toEqual({ user: session.user });

    const renewed = await refresh(cookiePair(registered));
    expect(renewed.status).toBe(200);
    const renewedSession = sessionResponseSchema.parse(renewed.body);

    const logout = await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${renewedSession.accessToken}`)
      .set('Cookie', cookiePair(renewed));
    expect(logout.status).toBe(204);

    expect((await refresh(cookiePair(renewed))).status).toBe(401);
  });

  // SEG-04: en la base de datos no hay contraseñas ni refresh tokens, solo sus hashes.
  it('stores only hashes of the password and of the refresh token', async () => {
    const person = newPerson();
    const registered = await register(person);
    const refreshToken = cookiePair(registered).replace('devpilot_refresh=', '');

    const user = await prisma.user.findUniqueOrThrow({
      where: { email: person.email },
      include: { refreshTokens: true },
    });

    expect(user.passwordHash).toMatch(/^\$2[aby]\$/);
    expect(user.passwordHash).not.toContain(person.password);
    expect(user.refreshTokens).toHaveLength(1);
    expect(user.refreshTokens[0]?.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(user.refreshTokens[0]?.tokenHash).not.toBe(refreshToken);
    expect(JSON.stringify(user)).not.toContain(refreshToken);
  });

  it('logs in with the registered password and not with another', async () => {
    const person = newPerson();
    await register(person);

    const right = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: person.email.toUpperCase(), password: person.password });
    const wrong = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: person.email, password: 'not the password' });

    expect(right.status).toBe(200);
    expect(wrong.status).toBe(401);
    expect(apiErrorSchema.parse(wrong.body).error.code).toBe('INVALID_CREDENTIALS');
  });

  it('lets the database decide when the same email registers twice at once', async () => {
    const person = newPerson();

    const responses = await Promise.all([register(person), register(person), register(person)]);

    expect(responses.map((response) => response.status).sort()).toEqual([201, 409, 409]);
    expect(await prisma.user.count({ where: { email: person.email } })).toBe(1);
  });

  // SEG-07: el refresh token rota en cada uso.
  it('lets only one of two simultaneous refreshes use the same token', async () => {
    const registered = await register(newPerson());
    const cookie = cookiePair(registered);

    const responses = await Promise.all([refresh(cookie), refresh(cookie)]);

    expect(responses.map((response) => response.status).sort()).toEqual([200, 401]);
  });

  // SEG-07: reutilizar un refresh token ya usado revoca todas las sesiones del usuario.
  it('closes every session when a used refresh token comes back', async () => {
    const person = newPerson();
    const registered = await register(person);
    const otherDevice = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: person.email, password: person.password });
    const renewed = await refresh(cookiePair(registered));

    const reused = await refresh(cookiePair(registered));

    expect(reused.status).toBe(401);
    expect((await refresh(cookiePair(renewed))).status).toBe(401);
    expect((await refresh(cookiePair(otherDevice))).status).toBe(401);

    const user = await prisma.user.findUniqueOrThrow({
      where: { email: person.email },
      include: { refreshTokens: true },
    });
    expect(user.refreshTokens.every((token) => token.revokedAt !== null)).toBe(true);
  });

  it('keeps the sessions of other users when one user is compromised', async () => {
    const victim = await register(newPerson());
    const bystander = await register(newPerson());
    await refresh(cookiePair(victim));

    await refresh(cookiePair(victim));

    expect((await refresh(cookiePair(bystander))).status).toBe(200);
  });

  it('stops accepting the session of an account that was deleted', async () => {
    const person = newPerson();
    const registered = await register(person);
    const session = sessionResponseSchema.parse(registered.body);

    await prisma.user.delete({ where: { email: person.email } });

    const me = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${session.accessToken}`);
    expect(me.status).toBe(401);
    expect((await refresh(cookiePair(registered))).status).toBe(401);
  });
});

// RNF-04: el límite de intentos se cuenta en la base de datos, no en memoria.
describe('login attempt limit against PostgreSQL', () => {
  it('blocks an email after 5 failed logins and stores only hashes', async () => {
    const email = `limit-${Date.now()}-${Math.round(Math.random() * 1e6)}@example.test`;
    await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Lucía Ferrer', email, password: 'correct horse battery' });
    for (let i = 0; i < 5; i += 1) {
      await request(app).post('/api/v1/auth/login').send({ email, password: 'wrong password' });
    }

    const blocked = await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password: 'correct horse battery' });

    expect(blocked.status).toBe(429);
    const stored = await prisma.authAttempt.findMany({ where: { scope: 'login' } });
    expect(JSON.stringify(stored)).not.toContain(email);
    await prisma.user.deleteMany({ where: { email } });
  });
});
