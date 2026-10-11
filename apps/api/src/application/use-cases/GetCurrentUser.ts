import type { User as PublicUser } from '@devpilot/shared';
import { DomainError } from '../../domain/errors/DomainError.js';
import type { UserRepository } from '../../domain/repositories/UserRepository.js';
import { toPublicUser } from '../dto/Session.js';

/** Datos del usuario en sesión, para `GET /auth/me`. */
export class GetCurrentUser {
  private readonly users: UserRepository;

  constructor(users: UserRepository) {
    this.users = users;
  }

  async execute(userId: string): Promise<PublicUser> {
    const user = await this.users.findById(userId);
    // Un token válido de una cuenta que ya no existe no da acceso a nada.
    if (!user) throw new DomainError('UNAUTHORIZED', 'Session is not valid');

    return toPublicUser(user);
  }
}
