import { describe, expect, it } from 'vitest';
import { DomainError } from '../../domain/errors/DomainError.js';
import { STALE_GENERATION_MS } from '../../domain/entities/Generation.js';
import { createGenerationFixture } from '../../test-support/generationFixture.js';
import {
  questionsReply,
  sampleQuestions,
  sampleSpecification,
  ScriptedLLMProvider,
  specificationReply,
  type ScriptedReply,
} from '../../test-support/llm.js';
import { portal } from '../../test-support/projectFixture.js';
import { RATE_LIMIT_BACKOFF_MS, UNAVAILABLE_BACKOFF_MS } from '../services/GenerationRunner.js';

const LUCIA = 'user-lucia';
const MARCOS = 'user-marcos';

const exportRequest = {
  type: 'feature' as const,
  inputText: 'Quiero que los clientes exporten su historial de pedidos a CSV',
  additionalContext: null,
  language: 'es' as const,
};

async function setUp(llm = new ScriptedLLMProvider(), limits = {}) {
  const fixture = createGenerationFixture({ llm, limits });
  const project = await fixture.projects.create(LUCIA, portal);
  return { ...fixture, llm, project };
}

async function rejection(promise: Promise<unknown>): Promise<DomainError> {
  const error = await promise.then(
    () => undefined,
    (reason: unknown) => reason,
  );
  if (!(error instanceof DomainError)) throw new Error('Expected a DomainError');
  return error;
}

// RF-GEN-01 a 04
describe('CreateGeneration', () => {
  it('answers at once with a generation in generating and finishes it in the background', async () => {
    const { createGeneration, getGeneration, background, project } = await setUp(
      new ScriptedLLMProvider([specificationReply()]),
    );

    const created = await createGeneration.execute(LUCIA, project.id, exportRequest);

    expect(created).toMatchObject({ status: 'generating', specification: null, title: null });

    await background.settle();
    const done = await getGeneration.execute(LUCIA, created.id);

    expect(done).toMatchObject({
      status: 'completed',
      title: sampleSpecification.title,
      complexity: 'M',
      specification: sampleSpecification,
      errorCode: null,
    });
    expect(done.completedAt).not.toBeNull();
  });

  it('sends the project context and the user text, delimited as data (RF-GEN-03, SEG-11)', async () => {
    const { createGeneration, background, llm, project } = await setUp(
      new ScriptedLLMProvider([specificationReply()]),
    );

    await createGeneration.execute(LUCIA, project.id, {
      ...exportRequest,
      additionalContext: 'Ya existe un servicio de pedidos',
    });
    await background.settle();

    const [request] = llm.requests;
    expect(request?.shape).toBe('questions-or-specification');
    expect(request?.system).not.toContain(exportRequest.inputText);
    expect(request?.prompt).toContain('"techStack": [\n      "React"');
    expect(request?.prompt).toContain(portal.conventions);
    expect(request?.prompt).toContain(exportRequest.inputText);
    expect(request?.prompt).toContain('Ya existe un servicio de pedidos');
  });

  it('answers 404 for a project of another user and creates nothing (RNF-06)', async () => {
    const { createGeneration, generations, project } = await setUp();

    const error = await rejection(createGeneration.execute(MARCOS, project.id, exportRequest));

    expect(error.code).toBe('NOT_FOUND');
    expect(generations.generations).toHaveLength(0);
  });

  // RF-GEN-07 y SEG-13
  it('stops at the daily limit of the user and says when it resets', async () => {
    const { createGeneration, generations, project, securityLog } = await setUp(
      new ScriptedLLMProvider(),
      { perUser: 2 },
    );
    generations.add(project);
    generations.add(project);

    const error = await rejection(createGeneration.execute(LUCIA, project.id, exportRequest));

    expect(error.code).toBe('USER_QUOTA_EXCEEDED');
    expect(error.details).toEqual({ limit: 2, resetsAt: '2026-10-12T00:00:00.000Z' });
    // SEG-09
    expect(securityLog.events).toEqual([
      { type: 'limit_reached', userId: LUCIA, detail: 'generations:user' },
    ]);
  });

  it('does not count the sample generation nor yesterday’s ones', async () => {
    const { createGeneration, generations, clock, project } = await setUp(
      new ScriptedLLMProvider([specificationReply()]),
      { perUser: 1 },
    );
    generations.add(project, { isSample: true });
    generations.add(project, { createdAt: new Date('2026-10-10T23:59:59.000Z') });

    await expect(createGeneration.execute(LUCIA, project.id, exportRequest)).resolves.toBeTruthy();
    expect(clock.now().toISOString()).toBe('2026-10-11T10:00:00.000Z');
  });

  it('stops at the global daily limit, whoever made the generations', async () => {
    const { createGeneration, generations, projects, project } = await setUp(
      new ScriptedLLMProvider(),
      { global: 1 },
    );
    const other = await projects.create(MARCOS, portal);
    generations.add(other);

    const error = await rejection(createGeneration.execute(LUCIA, project.id, exportRequest));

    expect(error.code).toBe('GLOBAL_QUOTA_EXCEEDED');
  });
});

// RF-GEN-09 y RF-GEN-10
describe('clarifying questions', () => {
  async function askedQuestions() {
    const fixture = await setUp(new ScriptedLLMProvider([questionsReply()]));
    const created = await fixture.createGeneration.execute(LUCIA, fixture.project.id, {
      ...exportRequest,
      inputText: 'Exportar pedidos a CSV, como siempre',
    });
    await fixture.background.settle();
    return { ...fixture, id: created.id };
  }

  it('leaves the generation waiting for answers with the questions of the model', async () => {
    const { getGeneration, id } = await askedQuestions();

    expect(await getGeneration.execute(LUCIA, id)).toMatchObject({
      status: 'needs_clarification',
      clarifyingQuestions: sampleQuestions,
      clarificationAnswers: null,
      specification: null,
    });
  });

  it('generates the specification with the answers and never asks twice', async () => {
    const { answerClarification, getGeneration, background, llm, id } = await askedQuestions();
    llm.reply(specificationReply());

    const answered = await answerClarification.execute(LUCIA, id, {
      answers: [{ questionId: 'q1', answer: 'Fecha, importe y estado' }],
      language: 'en',
    });
    expect(answered.status).toBe('generating');
    await background.settle();

    const second = llm.requests[1];
    expect(second?.shape).toBe('specification');
    expect(second?.prompt).toContain('Fecha, importe y estado');
    // El idioma es el de la interfaz al responder, aunque la entrada esté en español.
    expect(second?.prompt).toContain('"outputLanguage": "English"');
    expect(second?.prompt).toContain(sampleQuestions[1]?.question);

    expect(await getGeneration.execute(LUCIA, id)).toMatchObject({
      status: 'completed',
      clarificationAnswers: [
        { questionId: 'q1', answer: 'Fecha, importe y estado' },
        { questionId: 'q2', answer: '' },
      ],
      specification: sampleSpecification,
      // La especificación queda en el idioma de la respuesta, no en el de la petición.
      language: 'en',
    });
  });

  it('can go on without answers', async () => {
    const { answerClarification, background, generations, llm, id } = await askedQuestions();
    llm.reply(specificationReply());

    await answerClarification.execute(LUCIA, id, { skip: true, language: 'es' });
    await background.settle();

    expect(llm.requests[1]?.prompt).toContain('"answer": null');
    expect(generations.usageOf(id).attempts).toBe(2);
  });

  it('does not count the answers against the daily limit', async () => {
    const fixture = await setUp(new ScriptedLLMProvider([questionsReply()]), { perUser: 1 });
    const created = await fixture.createGeneration.execute(
      LUCIA,
      fixture.project.id,
      exportRequest,
    );
    await fixture.background.settle();
    fixture.llm.reply(specificationReply());

    await expect(
      fixture.answerClarification.execute(LUCIA, created.id, { skip: true, language: 'es' }),
    ).resolves.toMatchObject({ status: 'generating' });
  });

  it('refuses answers when the generation is not waiting for them', async () => {
    const { answerClarification, background, llm, id } = await askedQuestions();
    llm.reply(specificationReply());
    await answerClarification.execute(LUCIA, id, { skip: true, language: 'es' });
    await background.settle();

    const error = await rejection(
      answerClarification.execute(LUCIA, id, { skip: true, language: 'es' }),
    );

    expect(error.code).toBe('GENERATION_NOT_AWAITING_ANSWERS');
  });

  it('refuses an answer to a question that was not asked', async () => {
    const { answerClarification, id } = await askedQuestions();

    const error = await rejection(
      answerClarification.execute(LUCIA, id, {
        answers: [{ questionId: 'q9', answer: 'x' }],
        language: 'es',
      }),
    );

    expect(error.code).toBe('VALIDATION_ERROR');
  });

  it('answers 404 to another user (RNF-06)', async () => {
    const { answerClarification, getGeneration, id } = await askedQuestions();

    expect((await rejection(getGeneration.execute(MARCOS, id))).code).toBe('NOT_FOUND');
    expect(
      (await rejection(answerClarification.execute(MARCOS, id, { skip: true, language: 'es' })))
        .code,
    ).toBe('NOT_FOUND');
  });
});

// RF-GEN-05 y la tabla de errores de docs/ai-contract.md
describe('GenerationRunner', () => {
  async function generateWith(...replies: ScriptedReply[]) {
    const fixture = await setUp(new ScriptedLLMProvider(replies));
    const created = await fixture.createGeneration.execute(
      LUCIA,
      fixture.project.id,
      exportRequest,
    );
    await fixture.background.settle();
    return {
      ...fixture,
      result: await fixture.getGeneration.execute(LUCIA, created.id),
      usage: fixture.generations.usageOf(created.id),
    };
  }

  it('retries once with the validation errors when the answer breaks the schema', async () => {
    const { result, llm, usage } = await generateWith(
      { text: '{"kind":"specification","specification":{"title":""}}' },
      specificationReply(),
    );

    expect(result.status).toBe('completed');
    expect(llm.requests[1]?.prompt).toContain('did not follow the response schema');
    expect(usage).toMatchObject({ attempts: 2, inputTokens: 200, outputTokens: 100 });
  });

  it('fails with LLM_INVALID_RESPONSE after two invalid answers', async () => {
    const { result, failures } = await generateWith({ text: 'not json' }, { text: '{}' });

    expect(result).toMatchObject({ status: 'failed', errorCode: 'LLM_INVALID_RESPONSE' });
    expect(failures).toEqual(['LLM_INVALID_RESPONSE']);
  });

  it('waits and retries up to twice when the provider answers 429', async () => {
    const { result, waits } = await generateWith(
      { error: 'LLM_RATE_LIMITED' },
      { error: 'LLM_RATE_LIMITED' },
      specificationReply(),
    );

    expect(result.status).toBe('completed');
    expect(waits).toEqual([...RATE_LIMIT_BACKOFF_MS]);
  });

  it('fails with LLM_RATE_LIMITED after the third 429', async () => {
    const { result } = await generateWith(
      { error: 'LLM_RATE_LIMITED' },
      { error: 'LLM_RATE_LIMITED' },
      { error: 'LLM_RATE_LIMITED' },
    );

    expect(result).toMatchObject({ status: 'failed', errorCode: 'LLM_RATE_LIMITED' });
  });

  it('waits and retries once when the provider is down', async () => {
    const recovered = await generateWith({ error: 'LLM_UNAVAILABLE' }, specificationReply());
    const down = await generateWith({ error: 'LLM_UNAVAILABLE' }, { error: 'LLM_UNAVAILABLE' });

    expect(recovered.result.status).toBe('completed');
    expect(recovered.waits).toEqual([UNAVAILABLE_BACKOFF_MS]);
    expect(down.result).toMatchObject({ status: 'failed', errorCode: 'LLM_UNAVAILABLE' });
    expect(down.llm.requests).toHaveLength(2);
  });

  it('does not retry a timeout nor blocked content', async () => {
    const timeout = await generateWith({ error: 'LLM_TIMEOUT' });
    const blocked = await generateWith({ error: 'LLM_CONTENT_BLOCKED' });

    expect(timeout.result).toMatchObject({ status: 'failed', errorCode: 'LLM_TIMEOUT' });
    expect(blocked.result).toMatchObject({ status: 'failed', errorCode: 'LLM_CONTENT_BLOCKED' });
    expect(timeout.llm.requests).toHaveLength(1);
    expect(blocked.llm.requests).toHaveLength(1);
  });

  it('fails as unavailable when the provider throws something unexpected', async () => {
    const { result } = await generateWith();

    expect(result).toMatchObject({ status: 'failed', errorCode: 'LLM_UNAVAILABLE' });
  });
});

// docs/ai-contract.md: una generación en curso durante más de 2 minutos se da por fallida.
describe('GetGeneration', () => {
  it('fails a generation stuck in generating for more than two minutes', async () => {
    const { getGeneration, generations, clock, project } = await setUp();
    const stuck = generations.add(project, { status: 'generating' });

    expect((await getGeneration.execute(LUCIA, stuck.id)).status).toBe('generating');

    clock.advance(STALE_GENERATION_MS + 1);

    expect(await getGeneration.execute(LUCIA, stuck.id)).toMatchObject({
      status: 'failed',
      errorCode: 'LLM_TIMEOUT',
    });
  });

  it('counts the two minutes from the answers in the second phase', async () => {
    const { getGeneration, generations, clock, project } = await setUp();
    clock.advance(STALE_GENERATION_MS * 3);
    const answered = generations.add(project, {
      status: 'generating',
      createdAt: new Date(0),
      answeredAt: clock.now(),
    });

    expect((await getGeneration.execute(LUCIA, answered.id)).status).toBe('generating');
  });
});
