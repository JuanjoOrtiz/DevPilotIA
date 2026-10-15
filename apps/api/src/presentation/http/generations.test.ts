import {
  apiErrorSchema,
  generationResponseSchema,
  projectResponseSchema,
  translationResponseSchema,
} from '@devpilot/shared';
import type { Express } from 'express';
import request, { type Response } from 'supertest';
import { describe, expect, it } from 'vitest';
import { lucia } from '../../test-support/authFixture.js';
import {
  questionsReply,
  sampleSpecification,
  ScriptedLLMProvider,
  specificationReply,
} from '../../test-support/llm.js';
import { portal } from '../../test-support/projectFixture.js';
import { createTestApp } from '../../test-support/testApp.js';

const marcos = { name: 'Marcos Gil', email: 'marcos@example.com', password: 'another passphrase' };
const UNKNOWN_ID = '3f0c1d0e-6a53-4f0b-9c7b-2f4f4c1b9a10';
const exportRequest = {
  type: 'feature',
  inputText: 'Quiero que los clientes exporten su historial de pedidos a CSV',
};

const errorCode = (response: Response) => apiErrorSchema.parse(response.body).error.code;
const generationOf = (response: Response) =>
  generationResponseSchema.parse(response.body).generation;

async function signIn(app: Express, person = lucia) {
  const registered = await request(app).post('/api/v1/auth/register').send(person);
  const { accessToken, user } = registered.body as { accessToken: string; user: { id: string } };
  const authorization = `Bearer ${accessToken}`;
  return {
    userId: user.id,
    get: (path: string) => request(app).get(path).set('Authorization', authorization),
    post: (path: string, body?: object) =>
      request(app).post(path).set('Authorization', authorization).send(body),
    patch: (path: string, body: object) =>
      request(app).patch(path).set('Authorization', authorization).send(body),
    delete: (path: string) => request(app).delete(path).set('Authorization', authorization),
  };
}

async function setUp(llm = new ScriptedLLMProvider()) {
  const testApp = createTestApp({ llm });
  const session = await signIn(testApp.app);
  const created = await session.post('/api/v1/projects', portal);
  const project = projectResponseSchema.parse(created.body).project;
  return { ...testApp, session, project };
}

describe('POST /api/v1/projects/:id/generations', () => {
  it('answers 202 with the generation in generating', async () => {
    const { session, project, generations } = await setUp(
      new ScriptedLLMProvider([specificationReply()]),
    );

    const response = await session.post(
      `/api/v1/projects/${project.id}/generations`,
      exportRequest,
    );

    expect(response.status).toBe(202);
    expect(generationOf(response)).toMatchObject({ status: 'generating', projectId: project.id });

    await generations.background.settle();
    const read = await session.get(`/api/v1/generations/${generationOf(response).id}`);
    expect(generationOf(read).status).toBe('completed');
  });

  it('answers 400 with the reasons when the input is not valid', async () => {
    const { session, project } = await setUp();

    const response = await session.post(`/api/v1/projects/${project.id}/generations`, {
      type: 'epic',
      inputText: 'corto',
    });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      error: {
        code: 'VALIDATION_ERROR',
        details: { fields: { type: ['GENERATION_TYPE_INVALID'], inputText: ['INPUT_TOO_SHORT'] } },
      },
    });
  });

  // RF-GEN-07
  it('answers 429 with the reset time when the daily limit is reached', async () => {
    const { session, project, generations } = await setUp();
    for (let i = 0; i < 20; i += 1) {
      generations.generations.add({ id: project.id, userId: session.userId });
    }

    const response = await session.post(
      `/api/v1/projects/${project.id}/generations`,
      exportRequest,
    );

    expect(response.status).toBe(429);
    expect(response.body).toMatchObject({
      error: { code: 'USER_QUOTA_EXCEEDED', details: { limit: 20 } },
    });
  });

  it('answers 404 for a project of another user', async () => {
    const { app, project } = await setUp();
    const intruder = await signIn(app, marcos);

    const response = await intruder.post(
      `/api/v1/projects/${project.id}/generations`,
      exportRequest,
    );

    expect(response.status).toBe(404);
    expect(errorCode(response)).toBe('NOT_FOUND');
  });
});

describe('GET /api/v1/generations/:id', () => {
  it('answers 404 for an unknown id, a malformed id or another user', async () => {
    const { app, session, project } = await setUp(new ScriptedLLMProvider([specificationReply()]));
    const created = generationOf(
      await session.post(`/api/v1/projects/${project.id}/generations`, exportRequest),
    );
    const intruder = await signIn(app, marcos);

    expect((await session.get(`/api/v1/generations/${UNKNOWN_ID}`)).status).toBe(404);
    expect((await session.get('/api/v1/generations/not-a-uuid')).status).toBe(404);
    expect((await intruder.get(`/api/v1/generations/${created.id}`)).status).toBe(404);
  });

  it('needs a session (SEG-15)', async () => {
    const { app } = await setUp();

    const response = await request(app).get(`/api/v1/generations/${UNKNOWN_ID}`);

    expect(response.status).toBe(401);
  });
});

// RF-GEN-09
describe('POST /api/v1/generations/:id/answers', () => {
  async function waitingForAnswers() {
    const context = await setUp(new ScriptedLLMProvider([questionsReply()]));
    const created = generationOf(
      await context.session.post(
        `/api/v1/projects/${context.project.id}/generations`,
        exportRequest,
      ),
    );
    await context.generations.background.settle();
    return { ...context, id: created.id };
  }

  it('answers 202 and finishes with the specification', async () => {
    const { session, generations, llm, id } = await waitingForAnswers();
    expect(generationOf(await session.get(`/api/v1/generations/${id}`)).status).toBe(
      'needs_clarification',
    );
    llm.reply(specificationReply());

    const response = await session.post(`/api/v1/generations/${id}/answers`, {
      answers: [{ questionId: 'q1', answer: 'Fecha e importe' }],
    });
    await generations.background.settle();

    expect(response.status).toBe(202);
    expect(generationOf(await session.get(`/api/v1/generations/${id}`)).status).toBe('completed');
  });

  it('answers 409 when the generation is not waiting for answers', async () => {
    const { session, generations, llm, id } = await waitingForAnswers();
    llm.reply(specificationReply());
    await session.post(`/api/v1/generations/${id}/answers`, { skip: true });
    await generations.background.settle();

    const response = await session.post(`/api/v1/generations/${id}/answers`, { skip: true });

    expect(response.status).toBe(409);
    expect(errorCode(response)).toBe('GENERATION_NOT_AWAITING_ANSWERS');
  });

  it('answers 400 to a body that is neither answers nor skip', async () => {
    const { session, id } = await waitingForAnswers();

    const response = await session.post(`/api/v1/generations/${id}/answers`, { skip: false });

    expect(response.status).toBe(400);
  });
});

// RF-EXP-01
describe('GET /api/v1/generations/:id/export', () => {
  async function completed() {
    const context = await setUp(new ScriptedLLMProvider([specificationReply()]));
    const created = await context.session.post(
      `/api/v1/projects/${context.project.id}/generations`,
      exportRequest,
    );
    await context.generations.background.settle();
    return { ...context, id: generationOf(created).id };
  }

  it('downloads the specification as a Markdown file', async () => {
    const { session, id } = await completed();

    const response = await session.get(`/api/v1/generations/${id}/export?format=md&language=en`);

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toBe('text/markdown; charset=utf-8');
    expect(response.headers['content-disposition']).toBe(
      'attachment; filename="exportar-el-historial-de-pedidos-a-csv.md"',
    );
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.text).toContain('## Technical description');
  });

  it('defaults to Markdown with Spanish headings', async () => {
    const { session, id } = await completed();

    const response = await session.get(`/api/v1/generations/${id}/export`);

    expect(response.status).toBe(200);
    expect(response.text).toContain('## Descripción técnica');
  });

  it('answers 400 for a format it does not know', async () => {
    const { session, id } = await completed();

    const response = await session.get(`/api/v1/generations/${id}/export?format=pdf`);

    expect(response.status).toBe(400);
    expect(errorCode(response)).toBe('VALIDATION_ERROR');
  });

  it('answers 409 while the generation has no specification', async () => {
    const { session, project, generations } = await setUp(
      new ScriptedLLMProvider([questionsReply()]),
    );
    const created = await session.post(`/api/v1/projects/${project.id}/generations`, exportRequest);
    await generations.background.settle();

    const response = await session.get(`/api/v1/generations/${generationOf(created).id}/export`);

    expect(response.status).toBe(409);
    expect(errorCode(response)).toBe('SPECIFICATION_NOT_READY');
  });

  it("answers 404 for someone else's generation", async () => {
    const { app, id } = await completed();
    const other = await signIn(app, marcos);

    const response = await other.get(`/api/v1/generations/${id}/export`);

    expect(response.status).toBe(404);
  });

  it('answers 401 without a session', async () => {
    const { app } = createTestApp();

    const response = await request(app).get(`/api/v1/generations/${UNKNOWN_ID}/export`);

    expect(response.status).toBe(401);
  });
});

describe('GET /api/v1/generations/:id/translation', () => {
  it('answers with the specification in the requested language', async () => {
    const llm = new ScriptedLLMProvider([specificationReply()]);
    const { session, project, generations } = await setUp(llm);
    const created = await session.post(`/api/v1/projects/${project.id}/generations`, {
      ...exportRequest,
      language: 'es',
    });
    await generations.background.settle();
    llm.reply(specificationReply({ ...sampleSpecification, title: 'Export orders to CSV' }));

    const response = await session.get(
      `/api/v1/generations/${generationOf(created).id}/translation?language=en`,
    );

    expect(response.status).toBe(200);
    expect(translationResponseSchema.parse(response.body).translation).toMatchObject({
      language: 'en',
      specification: { title: 'Export orders to CSV' },
    });
  });

  it('answers 400 without a known language and 503 when the model is down', async () => {
    const llm = new ScriptedLLMProvider([specificationReply()]);
    const { session, project, generations } = await setUp(llm);
    const created = await session.post(`/api/v1/projects/${project.id}/generations`, exportRequest);
    await generations.background.settle();
    const path = `/api/v1/generations/${generationOf(created).id}/translation`;

    expect((await session.get(`${path}?language=fr`)).status).toBe(400);

    llm.reply({ error: 'LLM_UNAVAILABLE' }, { error: 'LLM_UNAVAILABLE' });
    const down = await session.get(`${path}?language=en`);
    expect(down.status).toBe(503);
    expect(errorCode(down)).toBe('LLM_UNAVAILABLE');
  });
});

describe('editing, regenerating and deleting a generation', () => {
  async function completed() {
    const context = await setUp(new ScriptedLLMProvider([specificationReply()]));
    const created = await context.session.post(
      `/api/v1/projects/${context.project.id}/generations`,
      exportRequest,
    );
    await context.generations.background.settle();
    return { ...context, id: generationOf(created).id };
  }

  // RF-EDI-02
  it('saves a valid edition and rejects one that breaks the schema', async () => {
    const { session, id } = await completed();
    const patch = (body: object) => session.patch(`/api/v1/generations/${id}`, body);

    const saved = await patch({
      specification: { ...sampleSpecification, title: 'Título editado' },
      language: 'es',
    });
    expect(saved.status).toBe(200);
    expect(generationOf(saved)).toMatchObject({ title: 'Título editado', isEdited: true });

    const invalid = await patch({
      specification: { ...sampleSpecification, userStories: [] },
      language: 'es',
    });
    expect(invalid.status).toBe(400);
    expect(errorCode(invalid)).toBe('VALIDATION_ERROR');
  });

  // RF-GEN-06
  it('regenerates with the same input and answers 202', async () => {
    const { session, generations, llm, id } = await completed();
    llm.reply(specificationReply());

    const response = await session.post(`/api/v1/generations/${id}/regenerate`, {
      language: 'en',
    });
    await generations.background.settle();

    expect(response.status).toBe(202);
    expect(generationOf(response)).toMatchObject({ status: 'generating', language: 'en' });
    expect(generationOf(response).id).not.toBe(id);
  });

  // RF-HIS-04
  it('deletes a generation and then answers 404', async () => {
    const { session, id } = await completed();
    const remove = () => session.delete(`/api/v1/generations/${id}`);

    expect((await remove()).status).toBe(204);
    expect((await session.get(`/api/v1/generations/${id}`)).status).toBe(404);
    expect((await remove()).status).toBe(404);
  });

  // RF-EXP-02
  it('downloads the specification as JSON', async () => {
    const { session, id } = await completed();

    const response = await session.get(`/api/v1/generations/${id}/export?format=json`);

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toBe('application/json; charset=utf-8');
    expect(response.headers['content-disposition']).toContain('.json"');
    expect(response.body).toMatchObject({
      exportVersion: 1,
      specification: { schemaVersion: 1, title: sampleSpecification.title },
    });
  });
});
