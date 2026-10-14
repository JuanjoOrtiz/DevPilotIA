import type { Specification } from '@devpilot/shared';
import { describe, expect, it } from 'vitest';
import { DomainError } from '../../domain/errors/DomainError.js';
import { createGenerationFixture } from '../../test-support/generationFixture.js';
import {
  sampleSpecification,
  ScriptedLLMProvider,
  specificationReply,
} from '../../test-support/llm.js';
import { portal } from '../../test-support/projectFixture.js';
import { structureProblems } from '../services/TranslationPrompt.js';

const LUCIA = 'user-lucia';
const MARCOS = 'user-marcos';

const english: Specification = {
  ...sampleSpecification,
  title: 'Export the order history to CSV',
  technicalDescription: 'New endpoint that streams the CSV with Node.js.',
};

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

// La especificación sigue el idioma de la interfaz.
describe('TranslateSpecification', () => {
  it('translates once and then reuses the stored translation', async () => {
    const { translateSpecification, llm, id } = await setUp(
      new ScriptedLLMProvider([specificationReply(english)]),
    );

    const first = await translateSpecification.execute(LUCIA, id, 'en');
    const again = await translateSpecification.execute(LUCIA, id, 'en');

    expect(first).toEqual({ language: 'en', specification: english });
    expect(again).toEqual(first);
    expect(llm.requests).toHaveLength(1);
    expect(llm.requests[0]?.prompt).toContain('"outputLanguage": "English"');
    expect(llm.requests[0]?.prompt).toContain(sampleSpecification.title);
  });

  it('answers with the original, without the model, in its own language', async () => {
    const { translateSpecification, llm, id } = await setUp();

    const result = await translateSpecification.execute(LUCIA, id, 'es');

    expect(result.specification).toEqual(sampleSpecification);
    expect(llm.requests).toHaveLength(0);
  });

  it('translates the edited version and again after a new edit', async () => {
    const llm = new ScriptedLLMProvider([specificationReply(english), specificationReply(english)]);
    const fixture = createGenerationFixture({ llm });
    const project = await fixture.projects.create(LUCIA, portal);
    const edited = { ...sampleSpecification, title: 'Versión editada' };
    const { id } = fixture.generations.add(project, {
      aiSpec: sampleSpecification,
      editedSpec: edited,
      editedAt: new Date('2026-10-12T10:00:00.000Z'),
    });

    await fixture.translateSpecification.execute(LUCIA, id, 'en');
    expect(llm.requests[0]?.prompt).toContain('Versión editada');

    const stored = fixture.generations.generations.find((g) => g.id === id);
    if (stored) stored.editedAt = new Date('2026-10-13T10:00:00.000Z');
    await fixture.translateSpecification.execute(LUCIA, id, 'en');

    expect(llm.requests).toHaveLength(2);
  });

  it('asks again once when the translation changes the structure', async () => {
    const broken = { ...english, complexity: { size: 'XL' as const, rationale: 'x' } };
    const { translateSpecification, llm, id } = await setUp(
      new ScriptedLLMProvider([specificationReply(broken), specificationReply(english)]),
    );

    const result = await translateSpecification.execute(LUCIA, id, 'en');

    expect(result.specification).toEqual(english);
    expect(llm.requests[1]?.prompt).toContain('complexity.size must be "M"');
  });

  it('fails with the provider code and keeps nothing', async () => {
    const { translateSpecification, generations, id } = await setUp(
      new ScriptedLLMProvider([{ error: 'LLM_RATE_LIMITED' }]),
    );

    const error = await rejection(translateSpecification.execute(LUCIA, id, 'en'));

    expect(error.code).toBe('LLM_RATE_LIMITED');
    expect(generations.generations.find((g) => g.id === id)?.translations).toEqual({});
  });

  it('retries once when the provider is down, and gives up after two invalid answers', async () => {
    const { translateSpecification, llm, id } = await setUp(
      new ScriptedLLMProvider([
        { error: 'LLM_UNAVAILABLE' },
        { text: 'not json' },
        { text: '{"kind":"questions"}' },
      ]),
    );

    const error = await rejection(translateSpecification.execute(LUCIA, id, 'en'));

    expect(error.code).toBe('LLM_INVALID_RESPONSE');
    expect(llm.requests).toHaveLength(3);
  });

  it('refuses a generation without specification and hides the ones of others', async () => {
    const { translateSpecification, generations, project, id } = await setUp();
    const failed = generations.add(project, { status: 'failed', errorCode: 'LLM_TIMEOUT' });

    expect((await rejection(translateSpecification.execute(LUCIA, failed.id, 'en'))).code).toBe(
      'SPECIFICATION_NOT_READY',
    );
    expect((await rejection(translateSpecification.execute(MARCOS, id, 'en'))).code).toBe(
      'NOT_FOUND',
    );
  });

  it('makes the export use the stored translation', async () => {
    const { translateSpecification, exportGeneration, id } = await setUp(
      new ScriptedLLMProvider([specificationReply(english)]),
    );
    await translateSpecification.execute(LUCIA, id, 'en');

    const file = await exportGeneration.execute(LUCIA, id, { format: 'md', language: 'en' });

    expect(file.content).toContain('# Export the order history to CSV');
    expect(file.fileName).toBe('export-the-order-history-to-csv.md');
  });
});

describe('structureProblems', () => {
  it('accepts a translation that keeps lists and fixed values', () => {
    expect(structureProblems(sampleSpecification, english)).toEqual([]);
  });

  it('lists every list length or fixed value that changed', () => {
    const [risk] = english.risks;
    const [test] = english.testCases;
    if (!risk || !test) throw new Error('The sample needs a risk and a test case');
    const changed: Specification = {
      ...english,
      edgeCases: [],
      risks: [{ ...risk, severity: 'high' }],
      testCases: [{ ...test, type: 'unit' }],
    };

    expect(structureProblems(sampleSpecification, changed)).toEqual([
      '- risks.0.severity must be "medium".',
      '- edgeCases length must be 1.',
      '- testCases.0.type must be "integration".',
    ]);
  });
});
