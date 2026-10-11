import type { CreateProjectRequest, Project } from '@devpilot/shared';
import { cleanup, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../i18n';
import { ApiError } from '../../services/apiClient';
import * as authService from '../../services/authService';
import * as projectService from '../../services/projectService';
import { generation, pageOf, portal, reservas } from '../../test/fixtures';
import { lucia, renderApp } from '../../test/renderApp';

vi.mock('../../services/authService');
vi.mock('../../services/projectService');

const api = vi.mocked(projectService);
const NEW_ID = '99999999-9999-4999-8999-999999999999';

/** Lo que guardaría el servidor: los tests comprueban lo que se ve tras cada cambio. */
let stored: Project[];

function find(projectId: string): Project {
  const project = stored.find((candidate) => candidate.id === projectId);
  if (!project) throw new ApiError('NOT_FOUND', 404);
  return project;
}

beforeEach(async () => {
  await i18n.changeLanguage('es');
  stored = [portal, reservas];

  vi.mocked(authService.restoreSession).mockResolvedValue(lucia);
  api.listProjects.mockImplementation(() => Promise.resolve([...stored]));
  api.getProject.mockImplementation(async (projectId) => find(projectId));
  api.createProject.mockImplementation(async (input: CreateProjectRequest) => {
    const project: Project = { ...portal, ...input, id: NEW_ID, generationCount: 0 };
    stored = [project, ...stored];
    return project;
  });
  api.updateProject.mockImplementation(async (projectId, input) => {
    const project = { ...find(projectId), ...input } as Project;
    stored = stored.map((candidate) => (candidate.id === projectId ? project : candidate));
    return project;
  });
  api.deleteProject.mockImplementation(async (projectId) => {
    find(projectId);
    stored = stored.filter((candidate) => candidate.id !== projectId);
  });
  api.listProjectGenerations.mockResolvedValue(pageOf([]));
});

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

const projectNames = () =>
  screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent);

// RF-PRO-02
describe('the list of projects', () => {
  it('shows the projects of the user', async () => {
    renderApp('/projects');

    expect(await screen.findByRole('link', { name: 'Portal de clientes' })).toBeTruthy();
    expect(projectNames()).toEqual(['Portal de clientes', 'App de reservas']);
  });

  // RNF-09
  it('says that it is loading until the projects arrive', async () => {
    api.listProjects.mockReturnValue(new Promise(() => undefined));
    renderApp('/projects');

    expect(await screen.findByText('Cargando proyectos…')).toBeTruthy();
    expect(screen.getByRole('status').textContent).toBe('Cargando proyectos…');
    expect(screen.getByRole('heading', { name: 'Proyectos', level: 1 })).toBeTruthy();
  });

  it('invites to create the first project when there is none', async () => {
    stored = [];
    const { user } = renderApp('/projects');

    expect(
      await screen.findByRole('heading', { name: 'Todavía no tienes proyectos' }),
    ).toBeTruthy();
    expect(screen.queryByLabelText('Buscar por nombre')).toBeNull();

    await user.click(screen.getByRole('link', { name: 'Crear proyecto' }));

    expect(await screen.findByRole('heading', { name: 'Nuevo proyecto', level: 1 })).toBeTruthy();
  });

  it('explains that the projects could not be loaded and lets the user retry', async () => {
    api.listProjects.mockRejectedValueOnce(new ApiError('NETWORK_ERROR'));
    const { user } = renderApp('/projects');

    expect((await screen.findByRole('alert')).textContent).toBe(
      'No se pudo contactar con el servidor. Comprueba tu conexión e inténtalo de nuevo.',
    );

    await user.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByRole('link', { name: 'Portal de clientes' })).toBeTruthy();
  });
});

// RF-PRO-01
describe('creating a project', () => {
  it('opens the new project and shows it in the list without reloading the page', async () => {
    const { user } = renderApp('/projects');

    await user.click(await screen.findByRole('link', { name: 'Nuevo proyecto' }));
    await user.type(await screen.findByLabelText('Nombre (obligatorio)'), 'API de pagos');
    await user.type(screen.getByLabelText('Stack tecnológico'), 'Go{Enter}');
    await user.click(screen.getByRole('button', { name: 'Crear proyecto' }));

    expect(await screen.findByRole('heading', { name: 'API de pagos', level: 1 })).toBeTruthy();
    expect(api.createProject).toHaveBeenCalledWith({
      name: 'API de pagos',
      description: '',
      techStack: ['Go'],
      conventions: '',
    });

    await user.click(screen.getByRole('link', { name: 'Proyectos', current: 'page' }));

    expect(await screen.findByRole('link', { name: 'API de pagos' })).toBeTruthy();
    expect(projectNames()).toEqual(['API de pagos', 'Portal de clientes', 'App de reservas']);
  });

  it('keeps the form and shows the error when the project cannot be created', async () => {
    api.createProject.mockRejectedValue(new ApiError('INTERNAL_ERROR', 500));
    const { user } = renderApp('/projects/new');

    await user.type(await screen.findByLabelText('Nombre (obligatorio)'), 'API de pagos');
    await user.click(screen.getByRole('button', { name: 'Crear proyecto' }));

    expect((await screen.findByRole('alert')).textContent).toBe(
      'Algo ha fallado en el servidor. Inténtalo de nuevo.',
    );
    expect((screen.getByLabelText('Nombre (obligatorio)') as HTMLInputElement).value).toBe(
      'API de pagos',
    );
  });

  it('goes back to the list when the user cancels', async () => {
    const { user } = renderApp('/projects/new');

    await user.click(await screen.findByRole('link', { name: 'Cancelar' }));

    expect(await screen.findByRole('link', { name: 'Portal de clientes' })).toBeTruthy();
    expect(api.createProject).not.toHaveBeenCalled();
  });
});

// RF-PRO-03 y RF-HIS-01
describe('the page of a project', () => {
  it('shows the data of the project and its history', async () => {
    api.listProjectGenerations.mockResolvedValue(
      pageOf([generation({ title: 'Exportar facturas a PDF' }), generation({ type: 'bug' })]),
    );
    renderApp(`/projects/${portal.id}`);

    expect(
      await screen.findByRole('heading', { name: 'Portal de clientes', level: 1 }),
    ).toBeTruthy();
    const summary = within(screen.getByRole('region', { name: 'Datos del proyecto' }));
    expect(summary.getByText(/Área privada/)).toBeTruthy();
    expect(summary.getByText('PostgreSQL')).toBeTruthy();
    expect(summary.getByText(/Tests con Vitest/)).toBeTruthy();

    expect(await screen.findByRole('rowheader', { name: 'Exportar facturas a PDF' })).toBeTruthy();
    expect(screen.getByText('1–2 de 2 generaciones')).toBeTruthy();
    expect(api.listProjectGenerations).toHaveBeenCalledWith(portal.id, 1, expect.anything());
  });

  it('says what is missing in a project that only has a name', async () => {
    stored = [{ ...portal, description: '', techStack: [], conventions: '' }];
    renderApp(`/projects/${portal.id}`);

    expect(await screen.findByText('Sin descripción.')).toBeTruthy();
    expect(screen.getByText('Sin tecnologías.')).toBeTruthy();
    expect(screen.getByText('Sin convenciones.')).toBeTruthy();
    expect(
      await screen.findByRole('heading', { name: 'Este proyecto todavía no tiene generaciones' }),
    ).toBeTruthy();
  });

  it('moves through the pages of the history and remembers the page in the address', async () => {
    const page = (number: number) =>
      pageOf(
        Array.from({ length: number === 3 ? 3 : 10 }, (_, index) =>
          generation({ title: `Página ${number}, fila ${index + 1}` }),
        ),
        { page: number, total: 23 },
      );
    api.listProjectGenerations.mockImplementation(async (_id, number) => page(number));
    const { user } = renderApp(`/projects/${portal.id}?page=2`);

    expect(await screen.findByRole('rowheader', { name: 'Página 2, fila 1' })).toBeTruthy();
    expect(screen.getByText('11–20 de 23 generaciones')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Siguiente' }));

    expect(await screen.findByRole('rowheader', { name: 'Página 3, fila 3' })).toBeTruthy();
    expect(screen.getByText('21–23 de 23 generaciones')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Siguiente' }).hasAttribute('disabled')).toBe(true);
  });

  it('keeps the project on screen when only its history fails', async () => {
    api.listProjectGenerations.mockRejectedValue(new ApiError('INTERNAL_ERROR', 500));
    renderApp(`/projects/${portal.id}`);

    expect((await screen.findByRole('alert')).textContent).toBe(
      'Algo ha fallado en el servidor. Inténtalo de nuevo.',
    );
    expect(screen.getByRole('heading', { name: 'Portal de clientes', level: 1 })).toBeTruthy();
  });

  // SEG-01: un proyecto de otra persona se ve igual que uno que no existe.
  it('says that the project was not found, without asking for its history', async () => {
    const { user } = renderApp('/projects/00000000-0000-4000-8000-000000000000');

    expect(
      await screen.findByRole('heading', { name: 'No hemos encontrado este proyecto' }),
    ).toBeTruthy();
    expect(api.listProjectGenerations).not.toHaveBeenCalled();

    await user.click(screen.getByRole('link', { name: 'Volver a proyectos' }));

    expect(await screen.findByRole('link', { name: 'Portal de clientes' })).toBeTruthy();
  });

  // SEG-05
  it('shows the text of the user as plain text', async () => {
    const markup = '<img src=x onerror="alert(1)">';
    stored = [{ ...portal, name: markup, description: markup, conventions: markup }];
    const { container } = renderApp(`/projects/${portal.id}`);

    expect(await screen.findByRole('heading', { name: markup, level: 1 })).toBeTruthy();
    expect(container.querySelector('img')).toBeNull();
  });
});

// RF-PRO-04
describe('editing a project', () => {
  it('saves the changes and goes back to the project', async () => {
    const { user } = renderApp(`/projects/${portal.id}`);

    await user.click(await screen.findByRole('link', { name: 'Editar' }));
    const name = await screen.findByLabelText('Nombre (obligatorio)');
    expect((name as HTMLInputElement).value).toBe('Portal de clientes');

    await user.clear(name);
    await user.type(name, 'Portal B2B');
    await user.click(screen.getByRole('button', { name: 'Quitar React' }));
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByRole('heading', { name: 'Portal B2B', level: 1 })).toBeTruthy();
    expect(api.updateProject).toHaveBeenCalledWith(portal.id, {
      name: 'Portal B2B',
      description: portal.description,
      techStack: ['Node.js', 'PostgreSQL'],
      conventions: portal.conventions,
    });
    expect(screen.queryByText('React')).toBeNull();
  });

  it('applies the same validations as creation', async () => {
    const { user } = renderApp(`/projects/${portal.id}/edit`);

    await user.clear(await screen.findByLabelText('Nombre (obligatorio)'));
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByText('Escribe un nombre para el proyecto.')).toBeTruthy();
    expect(api.updateProject).not.toHaveBeenCalled();
  });

  it('says that the project was not found when it is not there to edit', async () => {
    renderApp('/projects/00000000-0000-4000-8000-000000000000/edit');

    expect(
      await screen.findByRole('heading', { name: 'No hemos encontrado este proyecto' }),
    ).toBeTruthy();
    expect(screen.queryByLabelText('Nombre (obligatorio)')).toBeNull();
  });
});

// RF-PRO-05
describe('deleting a project', () => {
  it('asks for confirmation and warns that its generations are deleted too', async () => {
    const { user } = renderApp(`/projects/${portal.id}`);

    await user.click(await screen.findByRole('button', { name: 'Eliminar' }));

    const dialog = screen.getByRole('alertdialog', { name: '¿Eliminar «Portal de clientes»?' });
    expect(dialog.textContent).toContain(
      'Se borrarán también sus 11 generaciones. Esta acción no se puede deshacer.',
    );
    expect(api.deleteProject).not.toHaveBeenCalled();
  });

  it('deletes nothing when the user cancels', async () => {
    const { user } = renderApp(`/projects/${portal.id}`);

    await user.click(await screen.findByRole('button', { name: 'Eliminar' }));
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(api.deleteProject).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: 'Portal de clientes', level: 1 })).toBeTruthy();
  });

  it('deletes the project and goes back to a list that no longer shows it', async () => {
    const { user } = renderApp(`/projects/${portal.id}`);

    await user.click(await screen.findByRole('button', { name: 'Eliminar' }));
    await user.click(screen.getByRole('button', { name: 'Eliminar proyecto' }));

    expect(await screen.findByRole('link', { name: 'App de reservas' })).toBeTruthy();
    expect(api.deleteProject).toHaveBeenCalledWith(portal.id);
    await waitFor(() => expect(projectNames()).toEqual(['App de reservas']));
  });

  it('words the warning for a project with one generation and for one with none', async () => {
    stored = [reservas, { ...portal, generationCount: 0 }];
    const first = renderApp(`/projects/${reservas.id}`);

    await first.user.click(await screen.findByRole('button', { name: 'Eliminar' }));
    expect(screen.getByRole('alertdialog').textContent).toContain(
      'Se borrará también su generación. Esta acción no se puede deshacer.',
    );

    first.unmount();
    const second = renderApp(`/projects/${portal.id}`);

    await second.user.click(await screen.findByRole('button', { name: 'Eliminar' }));
    expect(screen.getByRole('alertdialog').textContent).toContain(
      'Este proyecto no tiene generaciones. Esta acción no se puede deshacer.',
    );
  });

  it('keeps the dialog open and explains the error when the project cannot be deleted', async () => {
    api.deleteProject.mockRejectedValue(new ApiError('NETWORK_ERROR'));
    const { user } = renderApp(`/projects/${portal.id}`);

    await user.click(await screen.findByRole('button', { name: 'Eliminar' }));
    await user.click(screen.getByRole('button', { name: 'Eliminar proyecto' }));

    const dialog = within(screen.getByRole('alertdialog'));
    expect((await dialog.findByRole('alert')).textContent).toContain(
      'No se pudo contactar con el servidor.',
    );
    expect(screen.getByRole('heading', { name: 'Portal de clientes', level: 1 })).toBeTruthy();
  });
});
