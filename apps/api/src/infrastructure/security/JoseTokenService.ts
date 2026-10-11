import { createHash, randomUUID } from 'node:crypto';
import { jwtVerify, SignJWT } from 'jose';
import type { Clock } from '../../domain/providers/Clock.js';
import type {
  IssuedAccessToken,
  IssuedRefreshToken,
  TokenService,
  TokenSubject,
} from '../../domain/providers/TokenService.js';

/** SEG-04: algoritmo fijado. Un token firmado con cualquier otro se rechaza. */
const ALGORITHM = 'HS256';
const ISSUER = 'devpilot-api';

export const ACCESS_TOKEN_SECONDS = 15 * 60;
export const REFRESH_TOKEN_SECONDS = 7 * 24 * 60 * 60;

type TokenKind = 'access' | 'refresh';

interface Secrets {
  accessSecret: string;
  refreshSecret: string;
}

/**
 * Tokens de sesión como JWT. Access y refresh usan secretos distintos y además llevan
 * su tipo en `aud`: uno nunca vale como el otro.
 */
export class JoseTokenService implements TokenService {
  private readonly keys: Record<TokenKind, Uint8Array>;
  private readonly clock: Clock;

  constructor(secrets: Secrets, clock: Clock) {
    this.keys = {
      access: new TextEncoder().encode(secrets.accessSecret),
      refresh: new TextEncoder().encode(secrets.refreshSecret),
    };
    this.clock = clock;
  }

  async issueAccessToken(userId: string): Promise<IssuedAccessToken> {
    const token = await this.sign('access', userId, ACCESS_TOKEN_SECONDS);
    return { token, expiresIn: ACCESS_TOKEN_SECONDS };
  }

  verifyAccessToken(token: string): Promise<TokenSubject | null> {
    return this.verify('access', token);
  }

  async issueRefreshToken(userId: string): Promise<IssuedRefreshToken> {
    const token = await this.sign('refresh', userId, REFRESH_TOKEN_SECONDS);
    // Mismo instante que el `exp` del JWT, que solo tiene precisión de segundos.
    const issuedAt = Math.floor(this.clock.now().getTime() / 1000);
    return { token, expiresAt: new Date((issuedAt + REFRESH_TOKEN_SECONDS) * 1000) };
  }

  verifyRefreshToken(token: string): Promise<TokenSubject | null> {
    return this.verify('refresh', token);
  }

  hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private sign(kind: TokenKind, userId: string, lifetimeSeconds: number): Promise<string> {
    const issuedAt = Math.floor(this.clock.now().getTime() / 1000);

    return (
      new SignJWT({})
        .setProtectedHeader({ alg: ALGORITHM, typ: 'JWT' })
        .setIssuer(ISSUER)
        .setAudience(kind)
        .setSubject(userId)
        // Sin esto, dos tokens emitidos en el mismo segundo serían idénticos.
        .setJti(randomUUID())
        .setIssuedAt(issuedAt)
        .setExpirationTime(issuedAt + lifetimeSeconds)
        .sign(this.keys[kind])
    );
  }

  private async verify(kind: TokenKind, token: string): Promise<TokenSubject | null> {
    try {
      const { payload } = await jwtVerify(token, this.keys[kind], {
        algorithms: [ALGORITHM],
        issuer: ISSUER,
        audience: kind,
        currentDate: this.clock.now(),
        requiredClaims: ['sub', 'exp', 'jti'],
      });
      return payload.sub ? { userId: payload.sub } : null;
    } catch {
      return null;
    }
  }
}
