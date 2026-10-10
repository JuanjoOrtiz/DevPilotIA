import { afterAll, describe, expect, it } from 'vitest';
import { loadEnv } from '../config/env.js';
import { PrismaDatabaseHealthProbe } from './PrismaDatabaseHealthProbe.js';
import { createPrismaClient } from './prismaClient.js';

describe('PrismaDatabaseHealthProbe', () => {
  const prisma = createPrismaClient(loadEnv().DATABASE_URL);
  // Puerto 9: nadie escucha, la conexión se rechaza al momento.
  const unreachable = createPrismaClient('postgresql://nobody:nothing@127.0.0.1:9/none');

  afterAll(async () => {
    await prisma.$disconnect();
    await unreachable.$disconnect();
  });

  it('reaches the configured database', async () => {
    expect(await new PrismaDatabaseHealthProbe(prisma).isReachable()).toBe(true);
  });

  it('reports an unreachable database instead of throwing', async () => {
    expect(await new PrismaDatabaseHealthProbe(unreachable, 2000).isReachable()).toBe(false);
  });

  it('finds the tables created by the migrations', async () => {
    expect(await prisma.user.count()).toBeGreaterThanOrEqual(0);
  });
});
