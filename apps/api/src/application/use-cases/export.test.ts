import { describe, expect, it } from 'vitest';
import { DomainError } from '../../domain/errors/DomainError.js';
import { createGenerationFixture } from '../../test-support/generationFixture.js';
import { sampleSpecification } from '../../test-support/llm.js';
import { portal } from '../../test-support/projectFixture.js';

const LUCIA = 'user-lucia';
const MARCOS = 'user-marcos';
const markdown = { format: 'md', language: 'es' } as const;

async function setUp() {
  const fixture = createGenerationFixture();
  const project = await fixture.projects.create(LUCIA, portal);
  return { ...fixture, project };
}

async function rejection(promise: Promise<unknown>): Promise<DomainError> {
  const error = await promise.then(
    () => undefined,
    (reason: unknown) => reason,
  );
  if (!(error instanceof DomainError)) throw new Error('Expected a DomainError');
  return error;
}

// RF-EXP-01
describe('ExportGeneration', () => {
  it('exports the specification as a Markdown file named after its title', async () => {
    const { exportGeneration, generations, project } = await setUp();
    const { id } = generations.add(project, { aiSpec: sampleSpecification });

    const file = await exportGeneration.execute(LUCIA, id, markdown);

    expect(file.fileName).toBe('exportar-el-historial-de-pedidos-a-csv.md');
    expect(file.contentType).toBe('text/markdown; charset=utf-8');
    expect(file.content).toContain('# Exportar el historial de pedidos a CSV');
  });

  it('exports the edited version when there is one', async () => {
    const { exportGeneration, generations, project } = await setUp();
    const edited = { ...sampleSpecification, title: 'Versión editada' };
    const { id } = generations.add(project, {
      aiSpec: sampleSpecification,
      editedSpec: edited,
      editedAt: new Date(),
    });

    const file = await exportGeneration.execute(LUCIA, id, markdown);

    expect(file.content).toContain('# Versión editada');
    expect(file.fileName).toBe('version-editada.md');
  });

  it('refuses a generation that has no specification yet', async () => {
    const { exportGeneration, generations, project } = await setUp();
    const { id } = generations.add(project, { status: 'failed', errorCode: 'LLM_TIMEOUT' });

    const error = await rejection(exportGeneration.execute(LUCIA, id, markdown));

    expect(error.code).toBe('SPECIFICATION_NOT_READY');
  });

  it("answers not found for someone else's generation", async () => {
    const { exportGeneration, generations, project } = await setUp();
    const { id } = generations.add(project, { aiSpec: sampleSpecification });

    const error = await rejection(exportGeneration.execute(MARCOS, id, markdown));

    expect(error.code).toBe('NOT_FOUND');
  });
});
