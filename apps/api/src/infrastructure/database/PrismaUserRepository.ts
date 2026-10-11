import type { User } from '../../domain/entities/User.js';
import { DomainError } from '../../domain/errors/DomainError.js';
import type { NewUser, UserRepository } from '../../domain/repositories/UserRepository.js';
import { isUniqueViolation } from './prismaErrors.js';
import type { PrismaClient } from './prismaClient.js';

export class PrismaUserRepository implements UserRepository {
  private readonly prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async create(user: NewUser): Promise<User> {
    try {
      return await this.prisma.user.create({ data: user });
    } catch (error) {
      // La restricción única de la base de datos decide: no hay carrera entre dos registros.
      if (isUniqueViolation(error)) {
        throw new DomainError(
          'EMAIL_ALREADY_REGISTERED',
          'An account with this email already exists',
          { fields: { email: ['EMAIL_ALREADY_REGISTERED'] } },
        );
      }
      throw error;
    }
  }
}
