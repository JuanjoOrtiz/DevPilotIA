import {
  SPEC_EXPORT_SCHEMA_URL,
  specificationExportSchema,
  specificationSchema,
  type Specification,
} from '@devpilot/shared';
import { describe, expect, it } from 'vitest';
import { DomainError } from '../../domain/errors/DomainError.js';
import { lucia } from '../../test-support/authFixture.js';
import {
  FakePasswordHasher,
  FakeTokenService,
  FixedClock,
  InMemoryGenerationRepository,
  InMemoryProjectRepository,
  InMemoryRefreshTokenRepository,
  InMemoryUserRepository,
} from '../../test-support/fakes.js';
import { createGenerationFixture } from '../../test-support/generationFixture.js';
import {
  sampleSpecification,
  ScriptedLLMProvider,
  specificationReply,
} from '../../test-support/llm.js';
import { portal } from '../../test-support/projectFixture.js';
import { SAMPLE_SPECIFICATION } from '../samples/sampleProject.js';
import { SampleProjectProvisioner } from '../services/SampleProjectProvisioner.js';
import { SessionIssuer } from '../services/SessionIssuer.js';
import { RegisterUser } from './RegisterUser.js';

const LUCIA = 'user-lucia';
const MARCOS = 'user-marcos';

async function setUp(llm = new ScriptedLLMProvider()) {
  const fixture = createGenerationFixture({ llm });
  const project = await fixture.projects.create(LUCIA, portal);
  const { id } = fixture.generations.add(project, { aiSpec: sampleSpecification });
  return { ...fixture, llm, project, id };
}

async function rejection(promise: Promise<unknown>): Promise<DomainError> {
  const error = await promise.then(
    () => undefined,
    (reason: unknown) => reason,
  );
  if (!(error instanceof DomainError)) throw new Error('Expected a DomainError');
  return error;
}

const edited: Specification = {
  ...sampleSpecification,
  title: 'Exportar pedidos y facturas a CSV',
  complexity: { size: 'L', rationale: 'Ahora también facturas' },
  edgeCases: [],
};

// RF-EDI-01 y 02
describe('UpdateSpecification', () => {
  it('stores the edited version, keeps the original and marks it as edited', async () => {
    const { updateSpecification, generations, clock, id } = await setUp();

    const result = await updateSpecification.execute(LUCIA, id, {
      specification: edited,
      language: 'es',
    });

    expect(result).toMatchObject({
      specification: edited,
      title: edited.title,
      complexity: 'L',
      isEdited: true,
    });
    const stored = generations.generations.find((g) => g.id === id);
    expect(stored?.aiSpec).toEqual(sampleSpecification);
    expect(stored?.editedAt).toEqual(clock.now());
  });

  it('records the language of the edited version and drops old translations', async () => {
    const { updateSpecification, generations, id } = await setUp();
    const stored = generations.generations.find((g) => g.id === id);
    if (stored) stored.translations = { en: { source: 'ai', specification: sampleSpecification } };

    const result = await updateSpecification.execute(LUCIA, id, {
      specification: edited,
      language: 'en',
    });

    expect(result.language).toBe('en');
    expect(stored?.translations).toEqual({});
  });

  it('refuses a generation without specification and hides the ones of others', async () => {
    const { updateSpecification, generations, project, id } = await setUp();
    const failed = generations.add(project, { status: 'failed', errorCode: 'LLM_TIMEOUT' });
    const request = { specification: edited, language: 'es' as const };

    expect((await rejection(updateSpecification.execute(LUCIA, failed.id, request))).code).toBe(
      'SPECIFICATION_NOT_READY',
    );
    expect((await rejection(updateSpecification.execute(MARCOS, id, request))).code).toBe(
      'NOT_FOUND',
    );
  });
});

// RF-EDI-03
describe('RestoreOriginalSpecification', () => {
  it('goes back to the AI version, its language, and drops the edition', async () => {
    const { updateSpecification, restoreOriginalSpecification, generations, id } = await setUp();
    await updateSpecification.execute(LUCIA, id, { specification: edited, language: 'en' });

    const result = await restoreOriginalSpecification.execute(LUCIA, id);

    expect(result).toMatchObject({
      specification: sampleSpecification,
      title: sampleSpecification.title,
      complexity: sampleSpecification.complexity.size,
      language: 'es',
      isEdited: false,
    });
    const stored = generations.generations.find((g) => g.id === id);
    expect(stored?.editedSpec).toBeNull();
    expect(stored?.aiSpec).toEqual(sampleSpecification);
  });

  it('keeps the language of the AI version across several editions', async () => {
    const { updateSpecification, restoreOriginalSpecification, id } = await setUp();
    await updateSpecification.execute(LUCIA, id, { specification: edited, language: 'en' });
    await updateSpecification.execute(LUCIA, id, { specification: edited, language: 'en' });

    expect((await restoreOriginalSpecification.execute(LUCIA, id)).language).toBe('es');
  });

  it('does nothing on a generation that was never edited', async () => {
    const { restoreOriginalSpecification, id } = await setUp();

    const result = await restoreOriginalSpecification.execute(LUCIA, id);

    expect(result).toMatchObject({ specification: sampleSpecification, isEdited: false });
  });

  it('refuses a generation without specification and hides the ones of others', async () => {
    const { restoreOriginalSpecification, generations, project, id } = await setUp();
    const failed = generations.add(project, { status: 'failed', errorCode: 'LLM_TIMEOUT' });

    expect((await rejection(restoreOriginalSpecification.execute(LUCIA, failed.id))).code).toBe(
      'SPECIFICATION_NOT_READY',
    );
    expect((await rejection(restoreOriginalSpecification.execute(MARCOS, id))).code).toBe(
      'NOT_FOUND',
    );
  });
});

// RF-HIS-04
describe('DeleteGeneration', () => {
  it("deletes the user's generation and answers not found for the rest", async () => {
    const { deleteGeneration, generations, id } = await setUp();

    expect((await rejection(deleteGeneration.execute(MARCOS, id))).code).toBe('NOT_FOUND');
    await deleteGeneration.execute(LUCIA, id);

    expect(generations.generations).toHaveLength(0);
    expect((await rejection(deleteGeneration.execute(LUCIA, id))).code).toBe('NOT_FOUND');
  });
});

// RF-GEN-06
describe('RegenerateGeneration', () => {
  it('creates a new generation with the same input and keeps the old one', async () => {
    const { regenerateGeneration, generations, background, project, llm } = await setUp(
      new ScriptedLLMProvider([specificationReply()]),
    );
    const source = generations.add(project, {
      type: 'bug',
      inputText: 'El login falla cuando la contraseña lleva tildes',
      additionalContext: 'Solo en iOS',
    });

    const created = await regenerateGeneration.execute(LUCIA, source.id, 'en');
    await background.settle();

    expect(created).toMatchObject({
      status: 'generating',
      type: 'bug',
      inputText: 'El login falla cuando la contraseña lleva tildes',
      additionalContext: 'Solo en iOS',
      language: 'en',
    });
    expect(created.id).not.toBe(source.id);
    expect(generations.generations).toHaveLength(3);
    expect(llm.requests[0]?.prompt).toContain('"outputLanguage": "English"');
  });

  it('counts against the daily limit like any other generation', async () => {
    const fixture = createGenerationFixture({ limits: { perUser: 1 } });
    const project = await fixture.projects.create(LUCIA, portal);
    const { id } = fixture.generations.add(project);

    expect((await rejection(fixture.regenerateGeneration.execute(LUCIA, id, 'es'))).code).toBe(
      'USER_QUOTA_EXCEEDED',
    );
  });
});

// RF-PRO-06
describe('the sample project of a new account', () => {
  function register(provisioner?: { provision: (userId: string) => Promise<void> }) {
    const clock = new FixedClock();
    const users = new InMemoryUserRepository(clock);
    const generations = new InMemoryGenerationRepository(clock);
    const projects = new InMemoryProjectRepository(clock, generations);
    const sessions = new SessionIssuer(
      new FakeTokenService(clock),
      new InMemoryRefreshTokenRepository(),
    );
    const registerUser = new RegisterUser(
      users,
      new FakePasswordHasher(),
      sessions,
      provisioner ?? new SampleProjectProvisioner(projects, generations, clock),
    );
    return { registerUser, projects, generations };
  }

  it('creates a project with a completed sample generation, without the model', async () => {
    const { registerUser, projects, generations } = register();

    const session = await registerUser.execute(lucia);

    const [project] = await projects.listForUser(session.user.id);
    expect(project?.generationCount).toBe(1);
    const [sample] = generations.generations;
    expect(sample).toMatchObject({ status: 'completed', isSample: true, language: 'es' });
    expect(await generations.countForUserSince(session.user.id, new Date(0))).toBe(0);
  });

  it('still opens the session if the sample cannot be created', async () => {
    const { registerUser } = register({ provision: () => Promise.reject(new Error('boom')) });

    const session = await registerUser.execute(lucia);

    expect(session.accessToken).toBeTruthy();
  });

  it('stores a sample specification that passes the public schema', () => {
    expect(specificationSchema.safeParse(SAMPLE_SPECIFICATION).success).toBe(true);
  });
});

// RF-EXP-02
describe('exporting to JSON', () => {
  async function exportJson(userId = LUCIA, setup?: Awaited<ReturnType<typeof setUp>>) {
    const { exportGeneration, id } = setup ?? (await setUp());
    const file = await exportGeneration.execute(userId, id, { format: 'json', language: 'es' });
    return { file, parsed: specificationExportSchema.parse(JSON.parse(file.content)) };
  }

  it('writes a file that passes the published schema, with the specification untouched', async () => {
    const { file, parsed } = await exportJson();

    expect(file.fileName).toBe('exportar-el-historial-de-pedidos-a-csv.json');
    expect(file.contentType).toBe('application/json; charset=utf-8');
    expect(parsed.$schema).toBe(SPEC_EXPORT_SCHEMA_URL);
    expect(parsed.exportVersion).toBe(1);
    expect(parsed.specification).toEqual(sampleSpecification);
    expect(parsed.specification.schemaVersion).toBe(1);
  });

  it('adds the context of the generation', async () => {
    const setup = await setUp();
    const { parsed } = await exportJson(LUCIA, setup);

    expect(parsed).toMatchObject({
      exportedAt: setup.clock.now().toISOString(),
      language: 'es',
      project: { name: portal.name },
      generation: { id: setup.id, type: 'feature', edited: false, editedAt: null },
    });
  });

  it('marks the edited version as such', async () => {
    const setup = await setUp();
    await setup.updateSpecification.execute(LUCIA, setup.id, {
      specification: edited,
      language: 'es',
    });

    const { parsed } = await exportJson(LUCIA, setup);

    expect(parsed.specification.title).toBe(edited.title);
    expect(parsed.generation.edited).toBe(true);
    expect(parsed.generation.editedAt).toBe(setup.clock.now().toISOString());
  });

  it('says the language the content is in, not the one asked for, when there is no translation', async () => {
    const { exportGeneration, id } = await setUp();

    const file = await exportGeneration.execute(LUCIA, id, { format: 'json', language: 'en' });

    expect(specificationExportSchema.parse(JSON.parse(file.content)).language).toBe('es');
  });

  it("answers not found for someone else's generation", async () => {
    const { exportGeneration, id } = await setUp();

    const error = await rejection(
      exportGeneration.execute(MARCOS, id, { format: 'json', language: 'es' }),
    );

    expect(error.code).toBe('NOT_FOUND');
  });
});
