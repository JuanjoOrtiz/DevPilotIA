import { dashboardResponseSchema, sessionResponseSchema } from '@devpilot/shared';
import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { compose } from './composition.js';
import { SeedError, seedDemoData } from './infrastructure/database/seed/seedDemoData.js';
import { BcryptPasswordHasher } from './infrastructure/security/BcryptPasswordHasher.js';
import { testEnv } from './test-support/testEnv.js';

// El seed contra PostgreSQL: cuenta local, cuenta existente en producción (SEG-16),
// repetición sin duplicados y el dashboard con los datos cargados (RF-DAS-01 a 03).
const hasher = new BcryptPasswordHasher(4);
const { app, database } = compose(testEnv(), { passwordHasher: hasher });
const { prisma } = database;
const run = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
const email = (name: string) => `seed-${run}-${name}@example.test`;
const now = new Date();
const base = { hashPassword: (password: string) => hasher.hash(password), now };

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { startsWith: `seed-${run}-` } } });
  await prisma.$disconnect();
});

describe('seed against PostgreSQL', () => {
  it('in production never creates a user, and fails if the account does not exist', async () => {
    const missing = email('missing');

    await expect(
      seedDemoData(prisma, {
        ...base,
        mode: 'production',
        email: missing,
        password: 'whatever-123',
      }),
    ).rejects.toBeInstanceOf(SeedError);

    expect(await prisma.user.count({ where: { email: missing } })).toBe(0);
  });

  it('in production loads the data into an existing account', async () => {
    const owner = email('owner');
    await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Lucía Ferrer', email: owner, password: 'correct horse battery' });

    const result = await seedDemoData(prisma, { ...base, mode: 'production', email: owner });

    expect(result).toMatchObject({ createdUser: false, projects: 3, generations: 25 });
    // Los 3 del seed más el proyecto de ejemplo que recibe toda cuenta al registrarse.
    expect(await prisma.project.count({ where: { user: { email: owner } } })).toBe(4);
  });

  it('locally creates the sample user, who can sign in and sees the four charts with data', async () => {
    const local = email('local');

    const result = await seedDemoData(prisma, {
      ...base,
      mode: 'local',
      email: local,
      password: 'devpilot-demo',
    });
    expect(result.createdUser).toBe(true);

    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: local, password: 'devpilot-demo' });
    const { accessToken } = sessionResponseSchema.parse(login.body);
    const response = await request(app)
      .get('/api/v1/dashboard/summary')
      .set('Authorization', `Bearer ${accessToken}`);
    const { summary } = dashboardResponseSchema.parse(response.body);

    expect(summary.totals).toMatchObject({
      projects: 3,
      generations: 25,
      features: 15,
      bugs: 10,
      completed: 20,
      failed: 4,
      completionRate: 0.8,
    });
    expect(summary.totals.averageDurationMs).toBeGreaterThan(5_000);
    expect(summary.activity.reduce((sum, day) => sum + day.count, 0)).toBe(25);
    expect(summary.projects.map((project) => project.count)).toEqual([11, 9, 5]);
    expect(summary.complexity).toEqual([
      { size: 'S', count: 6 },
      { size: 'M', count: 7 },
      { size: 'L', count: 5 },
      { size: 'XL', count: 2 },
    ]);
  });

  it('can run again without duplicating anything or touching other projects', async () => {
    const local = email('again');
    const options = { ...base, mode: 'local' as const, email: local, password: 'devpilot-demo' };
    const first = await seedDemoData(prisma, options);
    await prisma.project.create({
      data: { userId: first.userId, name: 'Proyecto propio', techStack: [] },
    });

    const second = await seedDemoData(prisma, options);

    expect(second).toMatchObject({ userId: first.userId, createdUser: false });
    expect(await prisma.project.count({ where: { userId: first.userId } })).toBe(4);
    expect(await prisma.generation.count({ where: { project: { userId: first.userId } } })).toBe(
      25,
    );
  });
});
