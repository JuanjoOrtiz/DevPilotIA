import type { LoginRequest } from '@devpilot/shared';
import { DomainError } from '../../domain/errors/DomainError.js';
import type { PasswordHasher } from '../../domain/providers/PasswordHasher.js';
import type { UserRepository } from '../../domain/repositories/UserRepository.js';
import type { Session } from '../dto/Session.js';
import type { AuthProtection, RequestContext } from '../services/AuthProtection.js';
import type { SessionIssuer } from '../services/SessionIssuer.js';

/**
 * RF-AUT-02: inicia sesión sin revelar si el email tiene cuenta. Los intentos fallidos se
 * limitan por email y por IP (RNF-04, SEG-07) y quedan registrados (SEG-09).
 */
export class LoginUser {
  private readonly users: UserRepository;
  private readonly hasher: PasswordHasher;
  private readonly sessions: SessionIssuer;
  private readonly decoyHash: Promise<string>;
  private readonly protection: AuthProtection | undefined;

  constructor(
    users: UserRepository,
    hasher: PasswordHasher,
    sessions: SessionIssuer,
    protection?: AuthProtection,
  ) {
    this.users = users;
    this.hasher = hasher;
    this.sessions = sessions;
    this.protection = protection;
    // Se calcula al arrancar, no en el primer login fallido, para que tampoco ese tarde más.
    this.decoyHash = hasher.hash('decoy-password-for-unknown-emails');
  }

  async execute(input: LoginRequest, context: RequestContext = {}): Promise<Session> {
    const limiter = this.protection?.limiter;
    const keys = limiter && {
      email: { rule: limiter.rules.loginByEmail, value: input.email },
      ip: { rule: limiter.rules.loginByIp, value: context.ip },
    };
    // Se comprueba antes de mirar la contraseña: con el cupo agotado ni siquiera una correcta entra.
    if (keys) await limiter.assertAllowed([keys.email, keys.ip], context.ip);

    const user = await this.users.findByEmail(input.email);

    // Si el email no existe se comprueba igualmente una contraseña, contra un hash de
    // relleno: la respuesta tarda lo mismo y el tiempo no delata qué emails tienen cuenta.
    const hash = user ? user.passwordHash : await this.decoyHash;
    const matches = await this.hasher.verify(input.password, hash);

    if (!user || !matches) {
      if (keys) await limiter.record([keys.email, keys.ip]);
      this.protection?.log.record({
        type: 'login_failed',
        userId: user?.id ?? null,
        ip: context.ip,
      });
      throw new DomainError('INVALID_CREDENTIALS', 'Email or password is incorrect');
    }
    if (keys) await limiter.clear(keys.email);
    return this.sessions.issueFor(user);
  }
}
