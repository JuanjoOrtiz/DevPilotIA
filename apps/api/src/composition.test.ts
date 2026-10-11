import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { compose } from './composition.js';
import { loadEnv } from './infrastructure/config/env.js';

// Puerto 9: nadie escucha, la conexión se rechaza al momento. No hace falta base de datos.
const env = loadEnv({ DATABASE_URL: 'postgresql://nobody:nothing@127.0.0.1:9/none' });

describe('compose', () => {
  const { app, database } = compose(env, { databasePool: { max: 2, idleTimeoutMillis: 1000 } });

  afterAll(async () => {
    await database.prisma.$disconnect();
  });

  it('wires the application from the environment', async () => {
    const response = await request(app).get('/api/v1/health');

    expect(response.status).toBe(503);
    expect(response.body).toEqual({ status: 'degraded', database: 'down', version: 'dev' });
  });

  it('applies the connection pool options of the platform', () => {
    expect(database.pool.options.max).toBe(2);
    expect(database.pool.options.idleTimeoutMillis).toBe(1000);
  });

  it('closes the pool when Prisma disconnects', async () => {
    const other = compose(env);
    await request(other.app).get('/api/v1/health');

    await other.database.prisma.$disconnect();

    expect(other.database.pool.ended).toBe(true);
  });
});
