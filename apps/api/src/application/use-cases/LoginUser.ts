import type { LoginRequest } from '@devpilot/shared';
import { DomainError } from '../../domain/errors/DomainError.js';
import type { PasswordHasher } from '../../domain/providers/PasswordHasher.js';
import type { UserRepository } from '../../domain/repositories/UserRepository.js';
import type { Session } from '../dto/Session.js';
import type { SessionIssuer } from '../services/SessionIssuer.js';

/** RF-AUT-02: inicia sesión sin revelar si el email tiene cuenta. */
export class LoginUser {
  private readonly users: UserRepository;
  private readonly hasher: PasswordHasher;
  private readonly sessions: SessionIssuer;
  private readonly decoyHash: Promise<string>;

  constructor(users: UserRepository, hasher: PasswordHasher, sessions: SessionIssuer) {
    this.users = users;
    this.hasher = hasher;
    this.sessions = sessions;
    // Se calcula al arrancar, no en el primer login fallido, para que tampoco ese tarde más.
    this.decoyHash = hasher.hash('decoy-password-for-unknown-emails');
  }

  async execute(input: LoginRequest): Promise<Session> {
    const user = await this.users.findByEmail(input.email);

    // Si el email no existe se comprueba igualmente una contraseña, contra un hash de
    // relleno: la respuesta tarda lo mismo y el tiempo no delata qué emails tienen cuenta.
    const hash = user ? user.passwordHash : await this.decoyHash;
    const matches = await this.hasher.verify(input.password, hash);

    if (!user || !matches) {
      throw new DomainError('INVALID_CREDENTIALS', 'Email or password is incorrect');
    }
    return this.sessions.issueFor(user);
  }
}
