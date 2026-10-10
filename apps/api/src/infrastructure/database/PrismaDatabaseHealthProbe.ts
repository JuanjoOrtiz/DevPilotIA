import type { DatabaseHealthProbe } from '../../domain/providers/DatabaseHealthProbe.js';
import type { PrismaClient } from './prismaClient.js';

const DEFAULT_TIMEOUT_MS = 5000;

/** Lanza una consulta mínima; si falla o tarda demasiado, la base de datos cuenta como caída. */
export class PrismaDatabaseHealthProbe implements DatabaseHealthProbe {
  private readonly prisma: PrismaClient;
  private readonly timeoutMs: number;

  constructor(prisma: PrismaClient, timeoutMs: number = DEFAULT_TIMEOUT_MS) {
    this.prisma = prisma;
    this.timeoutMs = timeoutMs;
  }

  async isReachable(): Promise<boolean> {
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => reject(new Error('Database ping timed out')), this.timeoutMs);
    });

    try {
      await Promise.race([this.prisma.$queryRaw`SELECT 1`, timeout]);
      return true;
    } catch {
      return false;
    } finally {
      clearTimeout(timer);
    }
  }
}
