import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createProjectFixture, portal } from '../../test-support/projectFixture.js';

const LUCIA = randomUUID();
const MARCOS = randomUUID();
const MINUTE = 60_000;

/** El error de dominio con el que termina una operación, o `undefined` si no falla. */
async function failure(operation: Promise<unknown>): Promise<string | undefined> {
  try {
    await operation;
    return undefined;
  } catch (error) {
    return (error as { code?: string }).code;
  }
}

// RF-PRO-01
describe('CreateProject', () => {
  it('creates the project for the user in session', async () => {
    const fixture = createProjectFixture();

    const project = await fixture.createProject.execute(LUCIA, portal);

    expect(project).toMatchObject(portal);
    expect(project.generationCount).toBe(0);
    expect(project.lastActivityAt).toBe(project.createdAt);
    expect(fixture.repository.projects).toHaveLength(1);
    expect(fixture.repository.projects[0]?.userId).toBe(LUCIA);
  });

  it('does not expose who owns the project', async () => {
    const fixture = createProjectFixture();

    const project = await fixture.createProject.execute(LUCIA, portal);

    expect(project).not.toHaveProperty('userId');
  });
});

// RF-PRO-02
describe('ListProjects', () => {
  it('returns only the projects of the user', async () => {
    const fixture = createProjectFixture();
    await fixture.createProject.execute(LUCIA, portal);
    await fixture.createProject.execute(MARCOS, { ...portal, name: 'Backoffice' });

    const projects = await fixture.listProjects.execute(LUCIA);

    expect(projects.map((project) => project.name)).toEqual(['Portal de clientes']);
    expect(await fixture.listProjects.execute(randomUUID())).toEqual([]);
  });

  it('counts the generations of each project and dates its last activity', async () => {
    const fixture = createProjectFixture();
    const created = await fixture.createProject.execute(LUCIA, portal);
    const project = { id: created.id, userId: LUCIA };

    fixture.clock.advance(MINUTE);
    fixture.generations.add(project);
    fixture.clock.advance(MINUTE);
    const last = fixture.generations.add(project, { status: 'failed', title: null });

    const [listed] = await fixture.listProjects.execute(LUCIA);

    expect(listed?.generationCount).toBe(2);
    expect(listed?.lastActivityAt).toBe(last.createdAt.toISOString());
  });

  it('puts first the project with the most recent activity, be it an edit or a generation', async () => {
    const fixture = createProjectFixture();
    const first = await fixture.createProject.execute(LUCIA, { ...portal, name: 'Primero' });
    fixture.clock.advance(MINUTE);
    const second = await fixture.createProject.execute(LUCIA, { ...portal, name: 'Segundo' });
    fixture.clock.advance(MINUTE);
    await fixture.createProject.execute(LUCIA, { ...portal, name: 'Tercero' });
    const names = async () =>
      (await fixture.listProjects.execute(LUCIA)).map((project) => project.name);

    expect(await names()).toEqual(['Tercero', 'Segundo', 'Primero']);

    fixture.clock.advance(MINUTE);
    fixture.generations.add({ id: first.id, userId: LUCIA });
    expect(await names()).toEqual(['Primero', 'Tercero', 'Segundo']);

    fixture.clock.advance(MINUTE);
    await fixture.updateProject.execute(LUCIA, second.id, { description: 'Otra' });
    expect(await names()).toEqual(['Segundo', 'Primero', 'Tercero']);
  });
});

// RF-PRO-03
describe('GetProject', () => {
  it('returns a project of the user', async () => {
    const fixture = createProjectFixture();
    const created = await fixture.createProject.execute(LUCIA, portal);

    expect(await fixture.getProject.execute(LUCIA, created.id)).toEqual(created);
  });

  // SEG-01: un recurso ajeno responde igual que uno que no existe.
  it('answers the same for a project of someone else and for one that does not exist', async () => {
    const fixture = createProjectFixture();
    const created = await fixture.createProject.execute(LUCIA, portal);

    expect(await failure(fixture.getProject.execute(MARCOS, created.id))).toBe('NOT_FOUND');
    expect(await failure(fixture.getProject.execute(LUCIA, randomUUID()))).toBe('NOT_FOUND');
  });
});

// RF-PRO-04
describe('UpdateProject', () => {
  it('changes only the fields that were sent', async () => {
    const fixture = createProjectFixture();
    const created = await fixture.createProject.execute(LUCIA, portal);
    fixture.clock.advance(MINUTE);

    const updated = await fixture.updateProject.execute(LUCIA, created.id, {
      name: 'Portal B2B',
      techStack: ['Vue'],
    });

    expect(updated).toMatchObject({
      name: 'Portal B2B',
      techStack: ['Vue'],
      description: portal.description,
      conventions: portal.conventions,
      createdAt: created.createdAt,
    });
    expect(updated.updatedAt).toBe(fixture.clock.now().toISOString());
    expect(updated.updatedAt).not.toBe(created.updatedAt);
  });

  it('can empty the optional fields', async () => {
    const fixture = createProjectFixture();
    const created = await fixture.createProject.execute(LUCIA, portal);

    const updated = await fixture.updateProject.execute(LUCIA, created.id, {
      description: '',
      techStack: [],
      conventions: '',
    });

    expect(updated).toMatchObject({ description: '', techStack: [], conventions: '' });
  });

  it('leaves the project untouched when nothing changes', async () => {
    const fixture = createProjectFixture();
    const created = await fixture.createProject.execute(LUCIA, portal);
    fixture.clock.advance(MINUTE);

    const updated = await fixture.updateProject.execute(LUCIA, created.id, {});

    expect(updated).toEqual(created);
  });

  it('keeps the generation count and the last activity of the project', async () => {
    const fixture = createProjectFixture();
    const created = await fixture.createProject.execute(LUCIA, portal);
    fixture.generations.add({ id: created.id, userId: LUCIA });
    fixture.clock.advance(MINUTE);

    const updated = await fixture.updateProject.execute(LUCIA, created.id, { name: 'Otro' });

    expect(updated.generationCount).toBe(1);
    expect(updated.lastActivityAt).toBe(updated.updatedAt);
  });

  it('does not change a project of someone else', async () => {
    const fixture = createProjectFixture();
    const created = await fixture.createProject.execute(LUCIA, portal);

    const code = await failure(
      fixture.updateProject.execute(MARCOS, created.id, { name: 'Robado' }),
    );

    expect(code).toBe('NOT_FOUND');
    expect(await failure(fixture.updateProject.execute(MARCOS, created.id, {}))).toBe('NOT_FOUND');
    expect(fixture.repository.projects[0]?.name).toBe(portal.name);
  });
});

// RF-PRO-05
describe('DeleteProject', () => {
  it('deletes the project together with its generations', async () => {
    const fixture = createProjectFixture();
    const doomed = await fixture.createProject.execute(LUCIA, portal);
    const kept = await fixture.createProject.execute(LUCIA, { ...portal, name: 'Backoffice' });
    fixture.generations.add({ id: doomed.id, userId: LUCIA });
    fixture.generations.add({ id: doomed.id, userId: LUCIA });
    fixture.generations.add({ id: kept.id, userId: LUCIA });

    await fixture.deleteProject.execute(LUCIA, doomed.id);

    expect(fixture.repository.projects.map((project) => project.id)).toEqual([kept.id]);
    expect(fixture.generations.generations.map((generation) => generation.projectId)).toEqual([
      kept.id,
    ]);
  });

  it('does not delete a project of someone else', async () => {
    const fixture = createProjectFixture();
    const created = await fixture.createProject.execute(LUCIA, portal);
    fixture.generations.add({ id: created.id, userId: LUCIA });

    expect(await failure(fixture.deleteProject.execute(MARCOS, created.id))).toBe('NOT_FOUND');
    expect(await failure(fixture.deleteProject.execute(LUCIA, randomUUID()))).toBe('NOT_FOUND');
    expect(fixture.repository.projects).toHaveLength(1);
    expect(fixture.generations.generations).toHaveLength(1);
  });
});

// RF-HIS-01
describe('ListProjectGenerations', () => {
  async function projectWithGenerations(count: number) {
    const fixture = createProjectFixture();
    const created = await fixture.createProject.execute(LUCIA, portal);
    for (let index = 1; index <= count; index += 1) {
      fixture.clock.advance(MINUTE);
      fixture.generations.add({ id: created.id, userId: LUCIA }, { title: `Generación ${index}` });
    }
    return { fixture, projectId: created.id };
  }

  it('lists the generations from newest to oldest, one page at a time', async () => {
    const { fixture, projectId } = await projectWithGenerations(5);

    const first = await fixture.listProjectGenerations.execute(LUCIA, projectId, {
      page: 1,
      pageSize: 2,
    });
    const last = await fixture.listProjectGenerations.execute(LUCIA, projectId, {
      page: 3,
      pageSize: 2,
    });

    expect(first).toMatchObject({ page: 1, pageSize: 2, total: 5 });
    expect(first.items.map((item) => item.title)).toEqual(['Generación 5', 'Generación 4']);
    expect(last.items.map((item) => item.title)).toEqual(['Generación 1']);
  });

  it('answers an empty page past the end, with the real total', async () => {
    const { fixture, projectId } = await projectWithGenerations(2);

    const page = await fixture.listProjectGenerations.execute(LUCIA, projectId, {
      page: 4,
      pageSize: 10,
    });

    expect(page).toEqual({ items: [], page: 4, pageSize: 10, total: 2 });
  });

  it('shows what each row needs and nothing of the specification', async () => {
    const fixture = createProjectFixture();
    const created = await fixture.createProject.execute(LUCIA, portal);
    const project = { id: created.id, userId: LUCIA };
    fixture.generations.add(project, {
      type: 'bug',
      status: 'failed',
      title: null,
      complexity: null,
      inputText: `El login falla\n\n  en Safari ${'x'.repeat(200)}`,
    });
    fixture.clock.advance(MINUTE);
    const edited = fixture.generations.add(project, {
      editedAt: fixture.clock.now(),
      isSample: true,
    });

    const { items } = await fixture.listProjectGenerations.execute(LUCIA, created.id, {
      page: 1,
      pageSize: 10,
    });

    expect(items[0]).toEqual({
      id: edited.id,
      type: 'feature',
      status: 'completed',
      title: 'Exportar el historial a CSV',
      inputExcerpt: 'Quiero exportar el historial de pedidos a CSV',
      complexity: 'M',
      isEdited: true,
      isSample: true,
      createdAt: edited.createdAt.toISOString(),
    });
    expect(items[1]).toMatchObject({
      type: 'bug',
      status: 'failed',
      title: null,
      complexity: null,
      isEdited: false,
      isSample: false,
    });
    expect(items[1]?.inputExcerpt.startsWith('El login falla en Safari xxx')).toBe(true);
    expect(items[1]?.inputExcerpt).toHaveLength(121);
  });

  it('answers an empty history for a project without generations', async () => {
    const { fixture, projectId } = await projectWithGenerations(0);

    const page = await fixture.listProjectGenerations.execute(LUCIA, projectId, {
      page: 1,
      pageSize: 10,
    });

    expect(page).toEqual({ items: [], page: 1, pageSize: 10, total: 0 });
  });

  // SEG-01
  it('does not show the history of a project of someone else', async () => {
    const { fixture, projectId } = await projectWithGenerations(3);
    const page = { page: 1, pageSize: 10 };

    expect(await failure(fixture.listProjectGenerations.execute(MARCOS, projectId, page))).toBe(
      'NOT_FOUND',
    );
    expect(await failure(fixture.listProjectGenerations.execute(LUCIA, randomUUID(), page))).toBe(
      'NOT_FOUND',
    );
  });
});
