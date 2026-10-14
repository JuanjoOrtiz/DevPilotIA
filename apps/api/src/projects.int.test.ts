import {
  apiErrorSchema,
  generationPageResponseSchema,
  projectListResponseSchema,
  projectResponseSchema,
  sessionResponseSchema,
} from '@devpilot/shared';
import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { compose } from './composition.js';
import { BcryptPasswordHasher } from './infrastructure/security/BcryptPasswordHasher.js';
import { testEnv } from './test-support/testEnv.js';

// Proyectos e historial contra PostgreSQL: repositorios de Prisma y sus consultas reales.
const { app, database } = compose(testEnv(), { passwordHasher: new BcryptPasswordHasher(4) });
const { prisma } = database;

const run = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
const UNKNOWN_ID = '3f0c1d0e-6a53-4f0b-9c7b-2f4f4c1b9a10';
let sequence = 0;

const portal = {
  name: 'Portal de clientes',
  description: 'Área privada donde los clientes consultan sus pedidos',
  techStack: ['React', 'Node.js', 'PostgreSQL'],
  conventions: 'Clean Architecture en el backend.',
};

/**
 * Una persona nueva en cada test, con su sesión iniciada. Salvo que se pida, sin el
 * proyecto de ejemplo del registro, para que cada test parta de una cuenta vacía.
 */
async function signIn({ keepSample = false } = {}) {
  sequence += 1;
  const registered = await request(app)
    .post('/api/v1/auth/register')
    .send({
      name: 'Lucía Ferrer',
      email: `projects-${run}-${sequence}@example.test`,
      password: 'correct horse battery',
    });
  const { accessToken, user } = sessionResponseSchema.parse(registered.body);
  const authorization = `Bearer ${accessToken}`;
  if (!keepSample) await prisma.project.deleteMany({ where: { userId: user.id } });

  return {
    userId: user.id,
    get: (path: string) => request(app).get(path).set('Authorization', authorization),
    post: (path: string, body: object) =>
      request(app).post(path).set('Authorization', authorization).send(body),
    patch: (path: string, body: object) =>
      request(app).patch(path).set('Authorization', authorization).send(body),
    delete: (path: string) => request(app).delete(path).set('Authorization', authorization),
  };
}

type Session = Awaited<ReturnType<typeof signIn>>;

async function createProject(session: Session, body: object = portal) {
  const response = await session.post('/api/v1/projects', body);
  expect(response.status).toBe(201);
  return projectResponseSchema.parse(response.body).project;
}

/** Las generaciones llegarán con el flujo de IA; aquí se insertan tal y como quedarán guardadas. */
function addGeneration(
  projectId: string,
  createdAt: Date,
  title: string | null = 'Exportar a CSV',
) {
  return prisma.generation.create({
    data: {
      projectId,
      type: 'feature',
      inputText: 'Quiero exportar el historial de pedidos a CSV',
      status: title ? 'completed' : 'failed',
      title,
      complexity: title ? 'M' : null,
      aiSpec: title ? { title } : undefined,
      createdAt,
    },
  });
}

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { startsWith: `projects-${run}-` } } });
  await prisma.$disconnect();
});

describe('projects against PostgreSQL', () => {
  it('creates, reads, edits and deletes a project', async () => {
    const session = await signIn();

    const created = await createProject(session);
    expect(created).toMatchObject({ ...portal, generationCount: 0 });
    expect(created.lastActivityAt).toBe(created.updatedAt);

    const read = await session.get(`/api/v1/projects/${created.id}`);
    expect(read.body).toEqual({ project: created });

    const edited = await session.patch(`/api/v1/projects/${created.id}`, {
      name: 'Portal B2B',
      techStack: [],
    });
    expect(edited.status).toBe(200);
    const updated = projectResponseSchema.parse(edited.body).project;
    expect(updated).toMatchObject({
      name: 'Portal B2B',
      techStack: [],
      description: portal.description,
      createdAt: created.createdAt,
    });
    expect(Date.parse(updated.updatedAt)).toBeGreaterThanOrEqual(Date.parse(created.updatedAt));

    expect((await session.delete(`/api/v1/projects/${created.id}`)).status).toBe(204);
    expect((await session.get(`/api/v1/projects/${created.id}`)).status).toBe(404);
    expect(await prisma.project.count({ where: { id: created.id } })).toBe(0);
  });

  it('stores the project under the user of the access token', async () => {
    const session = await signIn();
    const other = await signIn();

    const created = await createProject(session, { ...portal, userId: other.userId });

    const stored = await prisma.project.findUniqueOrThrow({ where: { id: created.id } });
    expect(stored.userId).toBe(session.userId);
  });

  // RF-PRO-02: número de generaciones y última actividad en cada proyecto de la lista.
  it('lists the projects with their generation count, most recent activity first', async () => {
    const session = await signIn();
    const quiet = await createProject(session, { name: 'Sin actividad' });
    const busy = await createProject(session, { name: 'Con generaciones' });
    const newest = await createProject(session, { name: 'El último creado' });
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await addGeneration(busy.id, new Date(tomorrow.getTime() - 60_000));
    await addGeneration(busy.id, tomorrow, null);

    const response = await session.get('/api/v1/projects');

    const { projects } = projectListResponseSchema.parse(response.body);
    expect(projects.map((project) => project.id)).toEqual([busy.id, newest.id, quiet.id]);
    expect(projects[0]).toMatchObject({
      generationCount: 2,
      lastActivityAt: tomorrow.toISOString(),
    });
    expect(projects[2]).toMatchObject({ generationCount: 0, lastActivityAt: quiet.updatedAt });
  });

  // RF-PRO-05: al eliminar un proyecto se eliminan sus generaciones.
  it('deletes the generations together with their project', async () => {
    const session = await signIn();
    const doomed = await createProject(session);
    const kept = await createProject(session, { name: 'Backoffice' });
    await addGeneration(doomed.id, new Date());
    await addGeneration(doomed.id, new Date());
    await addGeneration(kept.id, new Date());

    const response = await session.delete(`/api/v1/projects/${doomed.id}`);

    expect(response.status).toBe(204);
    expect(await prisma.generation.count({ where: { projectId: doomed.id } })).toBe(0);
    expect(await prisma.generation.count({ where: { projectId: kept.id } })).toBe(1);
  });

  // RF-HIS-01
  it('pages the history from newest to oldest', async () => {
    const session = await signIn();
    const project = await createProject(session);
    const start = Date.parse('2026-10-01T09:00:00.000Z');
    for (let index = 1; index <= 5; index += 1) {
      await addGeneration(project.id, new Date(start + index * 60_000), `Generación ${index}`);
    }
    const page = async (query: string) =>
      generationPageResponseSchema.parse(
        (await session.get(`/api/v1/projects/${project.id}/generations${query}`)).body,
      );

    const first = await page('?pageSize=2');
    const third = await page('?page=3&pageSize=2');
    const beyond = await page('?page=9&pageSize=2');

    expect(first).toMatchObject({ page: 1, pageSize: 2, total: 5 });
    expect(first.items.map((item) => item.title)).toEqual(['Generación 5', 'Generación 4']);
    expect(first.items[0]).toMatchObject({
      type: 'feature',
      status: 'completed',
      complexity: 'M',
      inputExcerpt: 'Quiero exportar el historial de pedidos a CSV',
      isEdited: false,
      isSample: false,
    });
    expect(third.items.map((item) => item.title)).toEqual(['Generación 1']);
    expect(beyond).toMatchObject({ items: [], total: 5 });
  });

  it('keeps a stable order between generations created at the same instant', async () => {
    const session = await signIn();
    const project = await createProject(session);
    const instant = new Date('2026-10-01T09:00:00.000Z');
    for (let index = 0; index < 6; index += 1) await addGeneration(project.id, instant);
    const ids = async (pageNumber: number) =>
      generationPageResponseSchema
        .parse(
          (
            await session.get(
              `/api/v1/projects/${project.id}/generations?page=${pageNumber}&pageSize=2`,
            )
          ).body,
        )
        .items.map((item) => item.id);

    const seen = [...(await ids(1)), ...(await ids(2)), ...(await ids(3))];

    expect(new Set(seen).size).toBe(6);
  });
});

// SEG-01: un usuario recibe 404 al leer, editar o borrar proyectos y generaciones de otro.
describe('isolation between users against PostgreSQL', () => {
  it('answers 404 to every operation on a project of someone else and changes nothing', async () => {
    const owner = await signIn();
    const intruder = await signIn();
    const project = await createProject(owner);
    await addGeneration(project.id, new Date());
    const path = `/api/v1/projects/${project.id}`;

    const attempts = [
      await intruder.get(path),
      await intruder.patch(path, { name: 'Robado' }),
      await intruder.delete(path),
      await intruder.get(`${path}/generations`),
    ];
    const unknown = await intruder.get(`/api/v1/projects/${UNKNOWN_ID}`);

    for (const attempt of attempts) {
      expect(attempt.status).toBe(404);
      expect(apiErrorSchema.parse(attempt.body).error.code).toBe('NOT_FOUND');
      expect(attempt.body).toEqual(unknown.body);
    }

    const stored = await prisma.project.findUniqueOrThrow({
      where: { id: project.id },
      include: { generations: true },
    });
    expect(stored.name).toBe(portal.name);
    expect(stored.generations).toHaveLength(1);
  });

  // RF-PRO-06
  it('gives every new account a sample project with a completed sample generation', async () => {
    const session = await signIn({ keepSample: true });

    const { projects } = projectListResponseSchema.parse(
      (await session.get('/api/v1/projects')).body,
    );
    expect(projects).toHaveLength(1);
    expect(projects[0]).toMatchObject({ generationCount: 1 });

    const history = generationPageResponseSchema.parse(
      (await session.get(`/api/v1/projects/${projects[0]?.id}/generations`)).body,
    );
    expect(history.items[0]).toMatchObject({
      status: 'completed',
      isSample: true,
      complexity: 'M',
    });
  });

  it('never lists the projects of another user', async () => {
    const owner = await signIn();
    const intruder = await signIn();
    await createProject(owner);

    const response = await intruder.get('/api/v1/projects');

    expect(response.body).toEqual({ projects: [] });
  });

  it('answers 404, and not an error, to an id that is not a UUID', async () => {
    const session = await signIn();

    const response = await session.get('/api/v1/projects/not-a-uuid/generations');

    expect(response.status).toBe(404);
  });
});
