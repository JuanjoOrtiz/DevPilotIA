import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PrismaClient } from './generated/client.js';

export type { PrismaClient };
export type DatabasePool = Pool;

export interface DatabasePoolOptions {
  /** Conexiones simultáneas como máximo. Por defecto, las 10 de node-postgres. */
  max?: number;
  /** Milisegundos que una conexión sin uso sigue abierta. Por defecto, 10.000. */
  idleTimeoutMillis?: number;
}

export interface Database {
  prisma: PrismaClient;
  /** El pool que usa Prisma. Quien arranca la API puede ajustarlo a su plataforma. */
  pool: DatabasePool;
}

/**
 * Único punto donde se crean el pool de conexiones y el cliente de Prisma;
 * composition.ts reparte el cliente a los repositorios. `prisma.$disconnect()` cierra
 * también el pool.
 */
export function createDatabase(
  connectionString: string,
  options: DatabasePoolOptions = {},
): Database {
  const pool = new Pool({ connectionString, ...options });
  const adapter = new PrismaPg(pool, { disposeExternalPool: true });
  return { prisma: new PrismaClient({ adapter }), pool };
}

/** Atajo para quien solo necesita el cliente, como los tests de integración. */
export function createPrismaClient(connectionString: string): PrismaClient {
  return createDatabase(connectionString).prisma;
}
