import {
  generationPageResponseSchema,
  generationResponseSchema,
  projectResponseSchema,
  sessionResponseSchema,
  translationResponseSchema,
} from '@devpilot/shared';
import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { compose } from './composition.js';
import { FakeLLMProvider } from './infrastructure/ai/FakeLLMProvider.js';
import { BcryptPasswordHasher } from './infrastructure/security/BcryptPasswordHasher.js';
import { InlineBackgroundTasks } from './test-support/llm.js';
import { testEnv } from './test-support/testEnv.js';

// Generación de punta a punta contra PostgreSQL, con el modelo simulado: repositorio de
// Prisma, estados, preguntas aclaratorias, contadores de uso y límites diarios.
const background = new InlineBackgroundTasks();
const { app, database } = compose(testEnv({ GENERATION_DAILY_LIMIT_PER_USER: '3' }), {
  passwordHasher: new BcryptPasswordHasher(4),
  llm: new FakeLLMProvider(),
  background,
});
const { prisma } = database;

const run = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
let sequence = 0;

const portal = {
  name: 'Portal de clientes',
  techStack: ['React', 'Node.js', 'PostgreSQL'],
  conventions: 'Clean Architecture en el backend.',
};
const longRequest = {
  type: 'feature',
  inputText:
    'Quiero que los clientes puedan exportar todo su historial de pedidos a un fichero CSV desde su área privada',
};
const shortRequest = { type: 'bug', inputText: 'El login falla a veces en móvil' };

async function signIn() {
  sequence += 1;
  const registered = await request(app)
    .post('/api/v1/auth/register')
    .send({
      name: 'Lucía Ferrer',
      email: `generations-${run}-${sequence}@example.test`,
      password: 'correct horse battery',
    });
  const { accessToken } = sessionResponseSchema.parse(registered.body);
  const authorization = `Bearer ${accessToken}`;
  const session = {
    authorization,
    get: (path: string) => request(app).get(path).set('Authorization', authorization),
    post: (path: string, body: object) =>
      request(app).post(path).set('Authorization', authorization).send(body),
  };
  const project = projectResponseSchema.parse(
    (await session.post('/api/v1/projects', portal)).body,
  ).project;
  return { ...session, project };
}

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { startsWith: `generations-${run}-` } } });
  await prisma.$disconnect();
});

describe('generations against PostgreSQL', () => {
  it('creates, generates and stores the specification with its usage', async () => {
    const session = await signIn();

    const created = await session.post(
      `/api/v1/projects/${session.project.id}/generations`,
      longRequest,
    );
    expect(created.status).toBe(202);
    const { id } = generationResponseSchema.parse(created.body).generation;
    await background.settle();

    const read = generationResponseSchema.parse(
      (await session.get(`/api/v1/generations/${id}`)).body,
    ).generation;
    expect(read).toMatchObject({ status: 'completed', complexity: 'S' });
    expect(read.specification?.technicalDescription).toContain('React, Node.js, PostgreSQL');

    const row = await prisma.generation.findUniqueOrThrow({ where: { id } });
    expect(row).toMatchObject({ model: 'fake-llm', attempts: 1 });
    expect(row.inputTokens).toBeGreaterThan(0);

    const history = generationPageResponseSchema.parse(
      (await session.get(`/api/v1/projects/${session.project.id}/generations`)).body,
    );
    expect(history.items[0]).toMatchObject({ id, status: 'completed', title: read.title });
  });

  it('asks, stores the answers and adds up the usage of both phases', async () => {
    const session = await signIn();
    const { id } = generationResponseSchema.parse(
      (await session.post(`/api/v1/projects/${session.project.id}/generations`, shortRequest)).body,
    ).generation;
    await background.settle();

    const waiting = generationResponseSchema.parse(
      (await session.get(`/api/v1/generations/${id}`)).body,
    ).generation;
    expect(waiting.status).toBe('needs_clarification');
    expect(waiting.clarifyingQuestions).toHaveLength(2);

    const answered = await session.post(`/api/v1/generations/${id}/answers`, {
      answers: [{ questionId: 'q1', answer: 'Solo en Safari para iOS' }],
    });
    expect(answered.status).toBe(202);
    await background.settle();

    const done = generationResponseSchema.parse(
      (await session.get(`/api/v1/generations/${id}`)).body,
    ).generation;
    expect(done.status).toBe('completed');
    expect(done.clarificationAnswers).toEqual([
      { questionId: 'q1', answer: 'Solo en Safari para iOS' },
      { questionId: 'q2', answer: '' },
    ]);
    expect(done.specification?.assumptions).toHaveLength(1);

    const row = await prisma.generation.findUniqueOrThrow({ where: { id } });
    expect(row.attempts).toBe(2);
    expect(row.answeredAt).not.toBeNull();

    const again = await session.post(`/api/v1/generations/${id}/answers`, { skip: true });
    expect(again.status).toBe(409);
  });

  it('applies the daily limit per user, counted in the database', async () => {
    const session = await signIn();
    const path = `/api/v1/projects/${session.project.id}/generations`;

    for (let i = 0; i < 3; i += 1) expect((await session.post(path, longRequest)).status).toBe(202);
    await background.settle();

    const blocked = await session.post(path, longRequest);
    expect(blocked.status).toBe(429);
    expect(blocked.body).toMatchObject({ error: { code: 'USER_QUOTA_EXCEEDED' } });
  });

  it('fails a generation that has been generating for more than two minutes', async () => {
    const session = await signIn();
    const stuck = await prisma.generation.create({
      data: {
        projectId: session.project.id,
        type: 'feature',
        inputText: longRequest.inputText,
        createdAt: new Date(Date.now() - 3 * 60 * 1000),
      },
    });

    const read = generationResponseSchema.parse(
      (await session.get(`/api/v1/generations/${stuck.id}`)).body,
    ).generation;

    expect(read).toMatchObject({ status: 'failed', errorCode: 'LLM_TIMEOUT' });
  });

  it('stores the language and the translation of the specification', async () => {
    const session = await signIn();
    const created = await session.post(`/api/v1/projects/${session.project.id}/generations`, {
      ...longRequest,
      language: 'en',
    });
    const { id } = generationResponseSchema.parse(created.body).generation;
    await background.settle();

    const read = generationResponseSchema.parse(
      (await session.get(`/api/v1/generations/${id}`)).body,
    );
    expect(read.generation.language).toBe('en');

    const translated = translationResponseSchema.parse(
      (await session.get(`/api/v1/generations/${id}/translation?language=es`)).body,
    );
    expect(translated.translation.specification.title.startsWith('[SP] ')).toBe(true);

    const row = await prisma.generation.findUniqueOrThrow({ where: { id } });
    expect(row.translations).toMatchObject({ es: { source: 'ai' } });
  });

  it('edits, exports, regenerates and deletes a generation in the database', async () => {
    const session = await signIn();
    const created = await session.post(
      `/api/v1/projects/${session.project.id}/generations`,
      longRequest,
    );
    const { id } = generationResponseSchema.parse(created.body).generation;
    await background.settle();
    const original = generationResponseSchema.parse(
      (await session.get(`/api/v1/generations/${id}`)).body,
    ).generation.specification;
    if (!original) throw new Error('The generation has no specification');

    const edited = await request(app)
      .patch(`/api/v1/generations/${id}`)
      .set('Authorization', session.authorization)
      .send({ specification: { ...original, title: 'Título editado' }, language: 'es' });
    expect(generationResponseSchema.parse(edited.body).generation).toMatchObject({
      title: 'Título editado',
      isEdited: true,
    });
    const row = await prisma.generation.findUniqueOrThrow({ where: { id } });
    expect(row.aiSpec).toMatchObject({ title: original.title });

    const json = await session.get(`/api/v1/generations/${id}/export?format=json`);
    expect(json.body).toMatchObject({
      generation: { id, edited: true },
      specification: { title: 'Título editado' },
    });

    const regenerated = await session.post(`/api/v1/generations/${id}/regenerate`, {});
    expect(regenerated.status).toBe(202);
    await background.settle();

    const removed = await request(app)
      .delete(`/api/v1/generations/${id}`)
      .set('Authorization', session.authorization);
    expect(removed.status).toBe(204);
    expect(await prisma.generation.count({ where: { projectId: session.project.id } })).toBe(1);
  });
});
