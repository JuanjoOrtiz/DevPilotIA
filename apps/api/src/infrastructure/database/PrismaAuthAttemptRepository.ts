import { createHash } from 'node:crypto';
import type {
  AttemptScope,
  AuthAttemptRepository,
} from '../../domain/repositories/AuthAttemptRepository.js';
import type { PrismaClient } from './prismaClient.js';

/** Los intentos se olvidan pasado un día: ningún límite mira más atrás. */
const RETENTION_MS = 24 * 60 * 60 * 1000;

/** La clave lleva un email o una IP: se guarda solo su hash. */
function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

export class PrismaAuthAttemptRepository implements AuthAttemptRepository {
  private readonly prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async record(scope: AttemptScope, key: string, at: Date): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.authAttempt.create({ data: { scope, keyHash: hashKey(key), createdAt: at } }),
      // La limpieza va con cada intento: sin tareas programadas, la tabla no crece sin fin.
      this.prisma.authAttempt.deleteMany({
        where: { createdAt: { lt: new Date(at.getTime() - RETENTION_MS) } },
      }),
    ]);
  }

  countSince(scope: AttemptScope, key: string, since: Date): Promise<number> {
    return this.prisma.authAttempt.count({
      where: { scope, keyHash: hashKey(key), createdAt: { gte: since } },
    });
  }

  async oldestSince(scope: AttemptScope, key: string, since: Date): Promise<Date | null> {
    const row = await this.prisma.authAttempt.findFirst({
      where: { scope, keyHash: hashKey(key), createdAt: { gte: since } },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true },
    });
    return row?.createdAt ?? null;
  }

  async clear(scope: AttemptScope, key: string): Promise<void> {
    await this.prisma.authAttempt.deleteMany({ where: { scope, keyHash: hashKey(key) } });
  }
}
