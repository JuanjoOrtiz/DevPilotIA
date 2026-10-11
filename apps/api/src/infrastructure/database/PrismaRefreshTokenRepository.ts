import type { RefreshToken } from '../../domain/entities/RefreshToken.js';
import type {
  NewRefreshToken,
  RefreshTokenRepository,
} from '../../domain/repositories/RefreshTokenRepository.js';
import type { PrismaClient } from './prismaClient.js';

export class PrismaRefreshTokenRepository implements RefreshTokenRepository {
  private readonly prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async create(token: NewRefreshToken): Promise<void> {
    await this.prisma.refreshToken.create({ data: token });
  }

  findByHash(tokenHash: string): Promise<RefreshToken | null> {
    return this.prisma.refreshToken.findUnique({ where: { tokenHash } });
  }

  async revokeIfActive(id: string, at: Date): Promise<boolean> {
    // Un solo UPDATE condicionado: de dos peticiones simultáneas, solo una cambia la fila.
    const { count } = await this.prisma.refreshToken.updateMany({
      where: { id, revokedAt: null },
      data: { revokedAt: at },
    });
    return count === 1;
  }

  async revokeAllForUser(userId: string, at: Date): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: at },
    });
  }
}
