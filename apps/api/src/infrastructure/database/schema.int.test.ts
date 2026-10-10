import { afterAll, describe, expect, it } from 'vitest';
import { loadEnv } from '../config/env.js';
import { createPrismaClient } from './prismaClient.js';

// Comprueba que las migraciones crean lo que el cliente de Prisma espera: columnas,
// enums, listas, JSON y borrado en cascada.
describe('database schema', () => {
  const prisma = createPrismaClient(loadEnv().DATABASE_URL);
  const email = `schema-test-${Date.now()}@example.test`;

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email } });
    await prisma.$disconnect();
  });

  it('stores a user with a project, a generation and a refresh token', async () => {
    const user = await prisma.user.create({
      data: {
        name: 'Schema Test',
        email,
        passwordHash: 'not-a-real-hash',
        refreshTokens: {
          create: { tokenHash: `hash-${email}`, expiresAt: new Date(Date.now() + 60_000) },
        },
        projects: {
          create: {
            name: 'Sample project',
            techStack: ['React', 'Node.js'],
            generations: {
              create: {
                type: 'feature',
                inputText: 'Add password recovery by email link',
                status: 'completed',
                aiSpec: { schemaVersion: 1, title: 'Password recovery' },
                title: 'Password recovery',
                complexity: 'M',
                isSample: true,
              },
            },
          },
        },
      },
      include: { projects: { include: { generations: true } }, refreshTokens: true },
    });

    const project = user.projects[0];
    const generation = project?.generations[0];

    expect(project?.techStack).toEqual(['React', 'Node.js']);
    expect(project?.description).toBe('');
    expect(generation).toMatchObject({
      type: 'feature',
      status: 'completed',
      complexity: 'M',
      attempts: 0,
      isSample: true,
      aiSpec: { schemaVersion: 1, title: 'Password recovery' },
      editedSpec: null,
    });
    expect(user.refreshTokens).toHaveLength(1);
  });

  it('rejects a second user with the same email', async () => {
    await expect(
      prisma.user.create({ data: { name: 'Duplicate', email, passwordHash: 'x' } }),
    ).rejects.toThrow();
  });

  it('deletes projects, generations and tokens with their user', async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });

    await prisma.user.delete({ where: { id: user.id } });

    expect(await prisma.project.count({ where: { userId: user.id } })).toBe(0);
    expect(await prisma.refreshToken.count({ where: { userId: user.id } })).toBe(0);
    expect(await prisma.generation.count({ where: { project: { userId: user.id } } })).toBe(0);
  });
});
