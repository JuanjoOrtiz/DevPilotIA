import {
  apiErrorSchema,
  generationPageResponseSchema,
  projectListResponseSchema,
  projectResponseSchema,
} from '@devpilot/shared';
import type { Express } from 'express';
import request, { type Response } from 'supertest';
import { describe, expect, it } from 'vitest';
import { lucia } from '../../test-support/authFixture.js';
import { portal } from '../../test-support/projectFixture.js';
import { createTestApp } from '../../test-support/testApp.js';

const marcos = { name: 'Marcos Gil', email: 'marcos@example.com', password: 'another passphrase' };
const UNKNOWN_ID = '3f0c1d0e-6a53-4f0b-9c7b-2f4f4c1b9a10';

const errorCode = (response: Response) => apiErrorSchema.parse(response.body).error.code;

/** Registra a una persona y devuelve cómo hacer peticiones en su nombre. */
async function signIn(app: Express, person = lucia) {
  const registered = await request(app).post('/api/v1/auth/register').send(person);
  const { accessToken, user } = registered.body as { accessToken: string; user: { id: string } };
  const authorization = `Bearer ${accessToken}`;

  return {
    userId: user.id,
    get: (path: string) => request(app).get(path).set('Authorization', authorization),
    post: (path: string, body?: object) =>
      request(app).post(path).set('Authorization', authorization).send(body),
    patch: (path: string, body?: object) =>
      request(app).patch(path).set('Authorization', authorization).send(body),
    delete: (path: string) => request(app).delete(path).set('Authorization', authorization),
  };
}

async function createProject(session: Awaited<ReturnType<typeof signIn>>, body: object = portal) {
  const response = await session.post('/api/v1/projects', body);
  return projectResponseSchema.parse(response.body).project;
}

describe('POST /api/v1/projects', () => {
  it('creates the project and answers 201 with it', async () => {
    const { app } = createTestApp();
    const session = await signIn(app);

    const response = await session.post('/api/v1/projects', portal);

    expect(response.status).toBe(201);
    expect(projectResponseSchema.parse(response.body).project).toMatchObject({
      ...portal,
      generationCount: 0,
    });
  });

  it('needs only a name', async () => {
    const { app } = createTestApp();
    const session = await signIn(app);

    const response = await session.post('/api/v1/projects', { name: '  API de pagos ' });

    expect(response.status).toBe(201);
    expect(projectResponseSchema.parse(response.body).project).toMatchObject({
      name: 'API de pagos',
      description: '',
      techStack: [],
      conventions: '',
    });
  });

  // RF-PRO-01: los límites de cada campo.
  it('explains which fields are invalid', async () => {
    const { app, projects } = createTestApp();
    const session = await signIn(app);

    const response = await session.post('/api/v1/projects', {
      name: ' ',
      description: 'x'.repeat(501),
      techStack: ['React', 'x'.repeat(31)],
      conventions: 'x'.repeat(2001),
    });

    expect(response.status).toBe(400);
    expect(apiErrorSchema.parse(response.body).error).toMatchObject({
      code: 'VALIDATION_ERROR',
      details: {
        fields: {
          name: ['PROJECT_NAME_REQUIRED'],
          description: ['DESCRIPTION_TOO_LONG'],
          'techStack.1': ['TAG_TOO_LONG'],
          conventions: ['CONVENTIONS_TOO_LONG'],
        },
      },
    });
    expect(projects.repository.projects).toHaveLength(0);
  });

  it('rejects more than fifteen tags', async () => {
    const { app } = createTestApp();
    const session = await signIn(app);
    const techStack = Array.from({ length: 16 }, (_, index) => `tag-${index}`);

    const response = await session.post('/api/v1/projects', { name: 'API', techStack });

    expect(response.status).toBe(400);
    expect(apiErrorSchema.parse(response.body).error.details).toEqual({
      fields: { techStack: ['TOO_MANY_TAGS'] },
    });
  });

  // SEG-01: el dueño sale del token, nunca del cuerpo de la petición.
  it('ignores an owner or an id sent by the client', async () => {
    const { app, projects } = createTestApp();
    const session = await signIn(app);
    const other = await signIn(app, marcos);

    const response = await session.post('/api/v1/projects', {
      ...portal,
      id: UNKNOWN_ID,
      userId: other.userId,
      generationCount: 99,
    });

    expect(response.status).toBe(201);
    expect(projects.repository.projects[0]?.userId).toBe(session.userId);
    expect(projects.repository.projects[0]?.id).not.toBe(UNKNOWN_ID);
    expect(projectResponseSchema.parse(response.body).project.generationCount).toBe(0);
  });
});

describe('GET /api/v1/projects', () => {
  it('lists the projects of the user in session and only those', async () => {
    const { app } = createTestApp();
    const session = await signIn(app);
    const other = await signIn(app, marcos);
    await createProject(session);
    await createProject(other, { name: 'Backoffice' });

    const response = await session.get('/api/v1/projects');

    expect(response.status).toBe(200);
    const { projects } = projectListResponseSchema.parse(response.body);
    expect(projects.map((project) => project.name)).toEqual(['Portal de clientes']);
  });

  it('answers an empty list to a user without projects', async () => {
    const { app } = createTestApp();
    const session = await signIn(app);

    const response = await session.get('/api/v1/projects');

    expect(response.body).toEqual({ projects: [] });
  });
});

describe('GET /api/v1/projects/:id', () => {
  it('returns the project', async () => {
    const { app } = createTestApp();
    const session = await signIn(app);
    const project = await createProject(session);

    const response = await session.get(`/api/v1/projects/${project.id}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ project });
  });

  it('answers 404 to an id that is not a UUID, without reaching the use case', async () => {
    const { app } = createTestApp();
    const session = await signIn(app);

    for (const id of ['1', 'not-a-uuid', "' OR 1=1 --"]) {
      const response = await session.get(`/api/v1/projects/${encodeURIComponent(id)}`);

      expect(response.status, id).toBe(404);
      expect(errorCode(response), id).toBe('NOT_FOUND');
    }
  });
});

describe('PATCH /api/v1/projects/:id', () => {
  it('changes the fields that were sent', async () => {
    const { app } = createTestApp();
    const session = await signIn(app);
    const project = await createProject(session);

    const response = await session.patch(`/api/v1/projects/${project.id}`, {
      name: 'Portal B2B',
      techStack: ['Vue', 'vue', 'Go'],
    });

    expect(response.status).toBe(200);
    expect(projectResponseSchema.parse(response.body).project).toMatchObject({
      id: project.id,
      name: 'Portal B2B',
      techStack: ['Vue', 'Go'],
      description: portal.description,
    });
  });

  // RF-PRO-04: mismas validaciones que al crear.
  it('applies the same validations as creation', async () => {
    const { app, projects } = createTestApp();
    const session = await signIn(app);
    const project = await createProject(session);

    const response = await session.patch(`/api/v1/projects/${project.id}`, {
      name: 'x'.repeat(81),
    });

    expect(response.status).toBe(400);
    expect(apiErrorSchema.parse(response.body).error.details).toEqual({
      fields: { name: ['PROJECT_NAME_TOO_LONG'] },
    });
    expect(projects.repository.projects[0]?.name).toBe(portal.name);
  });
});

describe('DELETE /api/v1/projects/:id', () => {
  it('deletes the project and answers 204 without a body', async () => {
    const { app } = createTestApp();
    const session = await signIn(app);
    const project = await createProject(session);

    const response = await session.delete(`/api/v1/projects/${project.id}`);

    expect(response.status).toBe(204);
    expect(response.text).toBe('');
    expect((await session.get(`/api/v1/projects/${project.id}`)).status).toBe(404);
    expect((await session.delete(`/api/v1/projects/${project.id}`)).status).toBe(404);
  });
});

describe('GET /api/v1/projects/:id/generations', () => {
  it('returns a page of the history, newest first', async () => {
    const { app, projects } = createTestApp();
    const session = await signIn(app);
    const project = await createProject(session);
    for (const title of ['Primera', 'Segunda', 'Tercera']) {
      projects.clock.advance(1_000);
      projects.generations.add({ id: project.id, userId: session.userId }, { title });
    }

    const response = await session.get(
      `/api/v1/projects/${project.id}/generations?page=1&pageSize=2`,
    );

    expect(response.status).toBe(200);
    const page = generationPageResponseSchema.parse(response.body);
    expect(page).toMatchObject({ page: 1, pageSize: 2, total: 3 });
    expect(page.items.map((item) => item.title)).toEqual(['Tercera', 'Segunda']);
    expect(Object.keys(response.body.items[0] as object)).not.toContain('inputText');
  });

  it('defaults to the first page of ten', async () => {
    const { app } = createTestApp();
    const session = await signIn(app);
    const project = await createProject(session);

    const response = await session.get(`/api/v1/projects/${project.id}/generations`);

    expect(response.body).toEqual({ items: [], page: 1, pageSize: 10, total: 0 });
  });

  it('rejects a page or a page size that makes no sense', async () => {
    const { app } = createTestApp();
    const session = await signIn(app);
    const project = await createProject(session);

    const response = await session.get(
      `/api/v1/projects/${project.id}/generations?page=0&pageSize=500`,
    );

    expect(response.status).toBe(400);
    expect(apiErrorSchema.parse(response.body).error).toMatchObject({
      code: 'VALIDATION_ERROR',
      details: { fields: { page: ['PAGE_INVALID'], pageSize: ['PAGE_SIZE_INVALID'] } },
    });
  });
});

// SEG-01: un recurso ajeno responde 404, igual que uno que no existe.
describe('isolation between users', () => {
  it('answers 404 to reading, editing, deleting or listing the history of a project of someone else', async () => {
    const { app, projects } = createTestApp();
    const owner = await signIn(app);
    const intruder = await signIn(app, marcos);
    const project = await createProject(owner);
    projects.generations.add({ id: project.id, userId: owner.userId });
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
      // Nada distingue «no es tuyo» de «no existe».
      expect(attempt.body).toEqual(unknown.body);
    }
    expect((await owner.get(path)).body).toEqual({ project: { ...project, generationCount: 1 } });
    expect(projects.generations.generations).toHaveLength(1);
  });

  it('answers 401 to every project route without an access token', async () => {
    const { app } = createTestApp();
    const path = `/api/v1/projects/${UNKNOWN_ID}`;

    const responses = [
      await request(app).get('/api/v1/projects'),
      await request(app).post('/api/v1/projects').send(portal),
      await request(app).get(path),
      await request(app).patch(path).send({ name: 'x' }),
      await request(app).delete(path),
      await request(app).get(`${path}/generations`),
    ];

    expect(responses.map((response) => response.status)).toEqual([401, 401, 401, 401, 401, 401]);
  });
});
