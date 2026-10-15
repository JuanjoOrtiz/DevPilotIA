import { DomainError } from '../../domain/errors/DomainError.js';
import type { Clock } from '../../domain/providers/Clock.js';
import type { SecurityLog } from '../../domain/providers/SecurityLog.js';
import type { TokenService } from '../../domain/providers/TokenService.js';
import type { RefreshTokenRepository } from '../../domain/repositories/RefreshTokenRepository.js';
import type { UserRepository } from '../../domain/repositories/UserRepository.js';
import type { Session } from '../dto/Session.js';
import type { SessionIssuer } from '../services/SessionIssuer.js';

interface Dependencies {
  users: UserRepository;
  refreshTokens: RefreshTokenRepository;
  tokens: TokenService;
  sessions: SessionIssuer;
  clock: Clock;
  /** SEG-09: la reutilización de un refresh token queda registrada y avisa. */
  log?: SecurityLog;
}

/**
 * RF-AUT-03: cambia un refresh token por una sesión nueva. Cada token vale una sola vez;
 * presentar uno ya usado se trata como robo y cierra todas las sesiones del usuario (SEG-07).
 */
export class RefreshSession {
  private readonly deps: Dependencies;

  constructor(dependencies: Dependencies) {
    this.deps = dependencies;
  }

  async execute(refreshToken: string | undefined, ip?: string | null): Promise<Session> {
    const { users, refreshTokens, tokens, sessions, clock } = this.deps;

    const subject = refreshToken ? await tokens.verifyRefreshToken(refreshToken) : null;
    if (!refreshToken || !subject) throw unauthorized();

    const stored = await refreshTokens.findByHash(tokens.hashRefreshToken(refreshToken));
    if (!stored || stored.userId !== subject.userId) throw unauthorized();

    const now = clock.now();
    const used = stored.revokedAt !== null || !(await refreshTokens.revokeIfActive(stored.id, now));
    if (used) {
      await refreshTokens.revokeAllForUser(stored.userId, now);
      this.deps.log?.record({ type: 'refresh_token_reuse', userId: stored.userId, ip });
      throw unauthorized();
    }
    if (stored.expiresAt <= now) throw unauthorized();

    const user = await users.findById(stored.userId);
    if (!user) throw unauthorized();

    return sessions.issueFor(user);
  }
}

/** Mismo error en todos los casos: la respuesta no dice por qué se rechaza el token. */
function unauthorized(): DomainError {
  return new DomainError('UNAUTHORIZED', 'Session is not valid');
}
