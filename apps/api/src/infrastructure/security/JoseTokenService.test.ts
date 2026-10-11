import { SignJWT } from 'jose';
import { describe, expect, it } from 'vitest';
import { FixedClock } from '../../test-support/fakes.js';
import {
  ACCESS_TOKEN_SECONDS,
  JoseTokenService,
  REFRESH_TOKEN_SECONDS,
} from './JoseTokenService.js';

const secrets = {
  accessSecret: 'access-secret-for-tests-0123456789abcdef',
  refreshSecret: 'refresh-secret-for-tests-0123456789abcde',
};
const userId = '7b0a8a5e-1111-4222-8333-444455556666';

function setup() {
  const clock = new FixedClock();
  return { clock, tokens: new JoseTokenService(secrets, clock) };
}

function encode(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

/** Un token como los de la API, pero firmado con el algoritmo y la clave que se indiquen. */
function forged(alg: string, secret: string, clock: FixedClock): Promise<string> {
  const now = Math.floor(clock.now().getTime() / 1000);
  return new SignJWT({})
    .setProtectedHeader({ alg })
    .setIssuer('devpilot-api')
    .setAudience('access')
    .setSubject(userId)
    .setJti('forged')
    .setIssuedAt(now)
    .setExpirationTime(now + 600)
    .sign(new TextEncoder().encode(secret));
}

describe('JoseTokenService', () => {
  it('issues an access token valid for 15 minutes', async () => {
    const { clock, tokens } = setup();

    const issued = await tokens.issueAccessToken(userId);

    expect(issued.expiresIn).toBe(ACCESS_TOKEN_SECONDS);
    expect(await tokens.verifyAccessToken(issued.token)).toEqual({ userId });

    clock.advance(ACCESS_TOKEN_SECONDS * 1000 - 1000);
    expect(await tokens.verifyAccessToken(issued.token)).toEqual({ userId });

    clock.advance(1000);
    expect(await tokens.verifyAccessToken(issued.token)).toBeNull();
  });

  it('issues a refresh token valid for 7 days and reports when it expires', async () => {
    const { clock, tokens } = setup();

    const issued = await tokens.issueRefreshToken(userId);

    expect(issued.expiresAt).toEqual(
      new Date(clock.now().getTime() + REFRESH_TOKEN_SECONDS * 1000),
    );
    expect(await tokens.verifyRefreshToken(issued.token)).toEqual({ userId });

    clock.advance(REFRESH_TOKEN_SECONDS * 1000);
    expect(await tokens.verifyRefreshToken(issued.token)).toBeNull();
  });

  it('never issues the same token twice', async () => {
    const { tokens } = setup();

    const first = await tokens.issueRefreshToken(userId);
    const second = await tokens.issueRefreshToken(userId);

    expect(first.token).not.toBe(second.token);
  });

  it('does not accept one kind of token as the other', async () => {
    const { tokens } = setup();
    const access = await tokens.issueAccessToken(userId);
    const refresh = await tokens.issueRefreshToken(userId);

    expect(await tokens.verifyRefreshToken(access.token)).toBeNull();
    expect(await tokens.verifyAccessToken(refresh.token)).toBeNull();
  });

  // SEG-04: un token firmado con otro algoritmo o sin firma se rechaza.
  it('rejects an unsigned token', async () => {
    const { clock, tokens } = setup();
    const now = Math.floor(clock.now().getTime() / 1000);
    const claims = { iss: 'devpilot-api', aud: 'access', sub: userId, jti: 'x', exp: now + 600 };
    const unsigned = `${encode({ alg: 'none', typ: 'JWT' })}.${encode(claims)}.`;

    expect(await tokens.verifyAccessToken(unsigned)).toBeNull();
  });

  it('rejects a token signed with another algorithm, even with the right secret', async () => {
    const { clock, tokens } = setup();

    expect(
      await tokens.verifyAccessToken(await forged('HS512', secrets.accessSecret, clock)),
    ).toBeNull();
    expect(
      await tokens.verifyAccessToken(await forged('HS256', secrets.accessSecret, clock)),
    ).toEqual({ userId });
  });

  it('rejects a token signed with another secret', async () => {
    const { clock, tokens } = setup();

    expect(await tokens.verifyAccessToken(await forged('HS256', 'x'.repeat(40), clock))).toBeNull();
    expect(
      await tokens.verifyAccessToken(await forged('HS256', secrets.refreshSecret, clock)),
    ).toBeNull();
  });

  it('rejects a token whose content was changed after signing', async () => {
    const { clock, tokens } = setup();
    const { token } = await tokens.issueAccessToken(userId);
    const [header, , signature] = token.split('.');
    const now = Math.floor(clock.now().getTime() / 1000);
    const claims = {
      iss: 'devpilot-api',
      aud: 'access',
      sub: 'someone-else',
      jti: 'x',
      exp: now + 600,
    };

    expect(await tokens.verifyAccessToken(`${header}.${encode(claims)}.${signature}`)).toBeNull();
  });

  it('rejects anything that is not a token', async () => {
    const { tokens } = setup();

    expect(await tokens.verifyAccessToken('')).toBeNull();
    expect(await tokens.verifyAccessToken('not.a.token')).toBeNull();
  });

  it('hashes a refresh token with SHA-256, always to the same value', () => {
    const { tokens } = setup();

    expect(tokens.hashRefreshToken('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });
});
