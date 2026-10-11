import type { RegisterRequest } from '@devpilot/shared';
import type { PasswordHasher } from '../../domain/providers/PasswordHasher.js';
import type { UserRepository } from '../../domain/repositories/UserRepository.js';
import type { Session } from '../dto/Session.js';
import type { SessionIssuer } from '../services/SessionIssuer.js';

/** RF-AUT-01: crea la cuenta y deja la sesión iniciada. */
export class RegisterUser {
  private readonly users: UserRepository;
  private readonly hasher: PasswordHasher;
  private readonly sessions: SessionIssuer;

  constructor(users: UserRepository, hasher: PasswordHasher, sessions: SessionIssuer) {
    this.users = users;
    this.hasher = hasher;
    this.sessions = sessions;
  }

  /** La entrada llega validada y con el email normalizado. */
  async execute(input: RegisterRequest): Promise<Session> {
    const passwordHash = await this.hasher.hash(input.password);
    // El repositorio rechaza un email repetido; así no hay carrera entre comprobar y crear.
    const user = await this.users.create({ name: input.name, email: input.email, passwordHash });

    return this.sessions.issueFor(user);
  }
}
