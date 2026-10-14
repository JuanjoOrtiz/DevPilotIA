import { cleanup, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../i18n';
import { ApiError } from '../../services/apiClient';
import * as authService from '../../services/authService';
import * as generationService from '../../services/generationService';
import * as projectService from '../../services/projectService';
import {
  generation,
  generationDetail,
  pageOf,
  portal,
  questions,
  specification,
} from '../../test/fixtures';
import { lucia, renderApp } from '../../test/renderApp';

vi.mock('../../services/authService');
vi.mock('../../services/projectService');
vi.mock('../../services/generationService');

const api = vi.mocked(generationService);
const GENERATION = generationDetail();
const NEW_PATH = `/projects/${portal.id}/generations/new`;
const PAGE_PATH = `/generations/${GENERATION.id}`;

beforeEach(async () => {
  await i18n.changeLanguage('es');
  vi.mocked(authService.restoreSession).mockResolvedValue(lucia);
  vi.mocked(projectService.getProject).mockResolvedValue(portal);
  vi.mocked(projectService.listProjectGenerations).mockResolvedValue(pageOf([]));
});

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

// RF-GEN-01, RF-GEN-04 y RF-GEN-08
describe('a new generation', () => {
  it('sends the type, the description and the context, and opens the generation', async () => {
    api.createGeneration.mockResolvedValue(generationDetail({ status: 'generating', title: null }));
    api.getGeneration.mockResolvedValue(generationDetail({ status: 'generating', title: null }));
    const { user } = renderApp(NEW_PATH);

    await user.click(await screen.findByRole('button', { name: 'Bug' }));
    await user.type(
      screen.getByRole('textbox', { name: /Descripción/ }),
      'El login falla cuando la contraseña lleva tildes',
    );
    await user.type(screen.getByRole('textbox', { name: /Contexto adicional/ }), 'Solo en iOS');
    await user.click(screen.getByRole('button', { name: 'Generar especificación' }));

    await waitFor(() =>
      expect(api.createGeneration).toHaveBeenCalledWith(portal.id, {
        type: 'bug',
        inputText: 'El login falla cuando la contraseña lleva tildes',
        additionalContext: 'Solo en iOS',
      }),
    );
    expect(
      await screen.findByRole('heading', { name: 'Generando la especificación' }),
    ).toBeTruthy();
  });

  it('warns not to paste code or confidential data next to the form', async () => {
    renderApp(NEW_PATH);

    expect(
      await screen.findByText(/No pegues código, credenciales ni datos confidenciales/),
    ).toBeTruthy();
    expect(screen.getByText(/las convenciones de «Portal de clientes»/)).toBeTruthy();
  });

  it('does not send a description shorter than 20 characters', async () => {
    const { user } = renderApp(NEW_PATH);

    await user.type(await screen.findByRole('textbox', { name: /Descripción/ }), 'corto');
    await user.click(screen.getByRole('button', { name: 'Generar especificación' }));

    expect(await screen.findByText('Describe la tarea con 20 caracteres o más.')).toBeTruthy();
    expect(api.createGeneration).not.toHaveBeenCalled();
  });

  // RF-GEN-07
  it('explains the daily limit and when it resets', async () => {
    api.createGeneration.mockRejectedValue(
      new ApiError('USER_QUOTA_EXCEEDED', 429, {
        limit: 20,
        resetsAt: '2026-10-13T00:00:00.000Z',
      }),
    );
    const { user } = renderApp(NEW_PATH);

    await user.type(
      await screen.findByRole('textbox', { name: /Descripción/ }),
      'Quiero exportar el historial de pedidos a CSV',
    );
    await user.click(screen.getByRole('button', { name: 'Generar especificación' }));

    expect((await screen.findByRole('alert')).textContent).toMatch(
      /límite de 20 generaciones al día\. Podrás generar de nuevo a partir del/,
    );
  });
});

describe('a generation', () => {
  // RF-GEN-02 y RF-GEN-10
  it('shows the specification with its assumptions and what the user asked for', async () => {
    api.getGeneration.mockResolvedValue(GENERATION);
    renderApp(PAGE_PATH);

    expect(
      await screen.findByRole('heading', { level: 1, name: specification.title }),
    ).toBeTruthy();
    const assumptions = screen.getByRole('complementary', { name: 'Supuestos' });
    expect(within(assumptions).getByText(specification.assumptions[0] ?? '')).toBeTruthy();
    expect(screen.getByRole('heading', { name: /Descripción técnica/ })).toBeTruthy();
    expect(screen.getByText(GENERATION.inputText)).toBeTruthy();
  });

  // RF-GEN-09
  it('asks the questions and sends the answers, blank ones included', async () => {
    api.getGeneration.mockResolvedValue(
      generationDetail({
        status: 'needs_clarification',
        clarifyingQuestions: questions,
        specification: null,
        title: null,
      }),
    );
    api.answerClarification.mockResolvedValue(
      generationDetail({ status: 'generating', specification: null, title: null }),
    );
    const { user } = renderApp(PAGE_PATH);

    expect(await screen.findByText(questions[0]?.question ?? '')).toBeTruthy();
    await user.type(
      screen.getByRole('textbox', { name: 'Tu respuesta a la pregunta 1' }),
      'Fecha e importe',
    );
    await user.click(screen.getByRole('button', { name: 'Generar especificación' }));

    expect(api.answerClarification).toHaveBeenCalledWith(GENERATION.id, {
      answers: [
        { questionId: 'q1', answer: 'Fecha e importe' },
        { questionId: 'q2', answer: '' },
      ],
    });
    expect(
      await screen.findByRole('heading', { name: 'Generando la especificación' }),
    ).toBeTruthy();
  });

  it('can go on without answering', async () => {
    api.getGeneration.mockResolvedValue(
      generationDetail({
        status: 'needs_clarification',
        clarifyingQuestions: questions,
        specification: null,
        title: null,
      }),
    );
    api.answerClarification.mockResolvedValue(generationDetail({ status: 'generating' }));
    const { user } = renderApp(PAGE_PATH);

    await user.click(await screen.findByRole('button', { name: 'Generar sin responder' }));

    expect(api.answerClarification).toHaveBeenCalledWith(GENERATION.id, { skip: true });
  });

  // RF-GEN-05
  it('explains a failure and retries with the same input as a new generation', async () => {
    const failed = generationDetail({
      status: 'failed',
      errorCode: 'LLM_TIMEOUT',
      specification: null,
      title: null,
      additionalContext: 'Solo en iOS',
    });
    const retried = generationDetail({
      id: '55555555-5555-4555-8555-555555555555',
      status: 'generating',
    });
    api.getGeneration.mockImplementation(async (id) => (id === failed.id ? failed : retried));
    api.createGeneration.mockResolvedValue(retried);
    const { user } = renderApp(PAGE_PATH);

    expect(
      await screen.findByText('El modelo ha tardado demasiado en responder. Inténtalo de nuevo.'),
    ).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(api.createGeneration).toHaveBeenCalledWith(portal.id, {
      type: 'feature',
      inputText: failed.inputText,
      additionalContext: 'Solo en iOS',
    });
    expect(
      await screen.findByRole('heading', { name: 'Generando la especificación' }),
    ).toBeTruthy();
  });

  it('says so when the generation does not exist or is of another user', async () => {
    api.getGeneration.mockRejectedValue(new ApiError('NOT_FOUND', 404));
    renderApp(PAGE_PATH);

    expect(await screen.findByText('No hemos encontrado esta generación')).toBeTruthy();
  });
});

// La especificación sigue el idioma de la interfaz.
describe('translating a generation', () => {
  const english = { ...specification, title: 'Export the order history to CSV' };

  it('translates the specification when the interface switches language', async () => {
    api.getGeneration.mockResolvedValue(GENERATION);
    api.getTranslation.mockResolvedValue(english);
    const { user } = renderApp(PAGE_PATH);
    await screen.findByRole('heading', { level: 1, name: specification.title });
    expect(api.getTranslation).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'EN' }));

    expect(await screen.findByRole('heading', { level: 1, name: english.title })).toBeTruthy();
    expect(api.getTranslation).toHaveBeenCalledWith(GENERATION.id, 'en', expect.anything());

    await user.click(screen.getByRole('button', { name: 'ES' }));
    expect(
      await screen.findByRole('heading', { level: 1, name: specification.title }),
    ).toBeTruthy();
    expect(api.getTranslation).toHaveBeenCalledOnce();
  });

  it('keeps the original and offers to try again when the translation fails', async () => {
    api.getGeneration.mockResolvedValue(GENERATION);
    api.getTranslation
      .mockRejectedValueOnce(new ApiError('LLM_UNAVAILABLE', 503))
      .mockResolvedValue(english);
    const { user } = renderApp(PAGE_PATH);
    await screen.findByRole('heading', { level: 1, name: specification.title });

    await user.click(screen.getByRole('button', { name: 'EN' }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('The specification could not be translated');
    expect(screen.getByRole('heading', { level: 1, name: specification.title })).toBeTruthy();

    await user.click(within(alert).getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('heading', { level: 1, name: english.title })).toBeTruthy();
  });
});

// RF-EXP-01
describe('exporting a generation', () => {
  it('downloads the specification in Markdown', async () => {
    api.getGeneration.mockResolvedValue(GENERATION);
    api.exportGeneration.mockResolvedValue(undefined);
    const { user } = renderApp(PAGE_PATH);

    await user.click(await screen.findByRole('button', { name: 'Exportar a Markdown' }));

    expect(api.exportGeneration).toHaveBeenCalledWith(GENERATION.id, 'md');
  });

  // RF-EXP-02
  it('downloads the specification in JSON', async () => {
    api.getGeneration.mockResolvedValue(GENERATION);
    api.exportGeneration.mockResolvedValue(undefined);
    const { user } = renderApp(PAGE_PATH);

    await user.click(await screen.findByRole('button', { name: 'Exportar a JSON' }));

    expect(api.exportGeneration).toHaveBeenCalledWith(GENERATION.id, 'json');
  });

  // RF-EXP-03
  it('copies the Markdown and confirms it', async () => {
    api.getGeneration.mockResolvedValue(GENERATION);
    api.copyMarkdown.mockResolvedValue(undefined);
    const { user } = renderApp(PAGE_PATH);

    await user.click(await screen.findByRole('button', { name: 'Copiar Markdown' }));

    expect((await screen.findByRole('status')).textContent).toBe(
      'Markdown copiado al portapapeles.',
    );
    expect(api.copyMarkdown).toHaveBeenCalledWith(GENERATION.id);
  });

  it('says why the file could not be downloaded', async () => {
    api.getGeneration.mockResolvedValue(GENERATION);
    api.exportGeneration.mockRejectedValue(new ApiError('NETWORK_ERROR'));
    const { user } = renderApp(PAGE_PATH);

    await user.click(await screen.findByRole('button', { name: 'Exportar a Markdown' }));

    expect((await screen.findByRole('alert')).textContent).toBe(
      'No se pudo exportar: No se pudo contactar con el servidor. Comprueba tu conexión e inténtalo de nuevo.',
    );
  });

  it('is not offered while there is no specification', async () => {
    api.getGeneration.mockResolvedValue(
      generationDetail({ status: 'failed', errorCode: 'LLM_TIMEOUT', specification: null }),
    );
    renderApp(PAGE_PATH);

    await screen.findByRole('button', { name: 'Reintentar' });

    expect(screen.queryByRole('button', { name: 'Exportar a Markdown' })).toBeNull();
  });
});

// RF-GEN-06 y RF-HIS-04
describe('regenerating and deleting a generation', () => {
  it('regenerates with the same input and opens the new generation', async () => {
    const created = generationDetail({
      id: '55555555-5555-4555-8555-555555555555',
      status: 'generating',
      title: null,
      specification: null,
    });
    api.getGeneration.mockImplementation(async (id) => (id === created.id ? created : GENERATION));
    api.regenerateGeneration.mockResolvedValue(created);
    const { user } = renderApp(PAGE_PATH);

    await user.click(await screen.findByRole('button', { name: 'Regenerar' }));

    expect(api.regenerateGeneration).toHaveBeenCalledWith(GENERATION.id);
    expect(
      await screen.findByRole('heading', { name: 'Generando la especificación' }),
    ).toBeTruthy();
  });

  it('asks for confirmation before deleting and then goes back to the project', async () => {
    api.getGeneration.mockResolvedValue(GENERATION);
    api.deleteGeneration.mockResolvedValue(undefined);
    const { user } = renderApp(PAGE_PATH);

    await user.click(await screen.findByRole('button', { name: 'Eliminar' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(api.deleteGeneration).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole('button', { name: 'Eliminar generación' }));

    expect(api.deleteGeneration).toHaveBeenCalledWith(GENERATION.id);
    expect(await screen.findByRole('heading', { level: 1, name: portal.name })).toBeTruthy();
  });
});

// RF-EDI-01, 02 y 04
describe('editing a generation', () => {
  const EDIT_PATH = `/generations/${GENERATION.id}/edit`;

  it('saves the edited specification, validated, in the language it was edited', async () => {
    api.getGeneration.mockResolvedValue(GENERATION);
    api.updateSpecification.mockImplementation(async (_id, input) =>
      generationDetail({
        specification: input.specification,
        title: input.specification.title,
        isEdited: true,
      }),
    );
    const { user } = renderApp(EDIT_PATH);

    const title = await screen.findByRole('textbox', { name: 'Título' });
    await user.clear(title);
    await user.type(title, 'Exportar pedidos y facturas');
    await user.click(screen.getByRole('button', { name: 'Añadir caso límite' }));
    await user.type(screen.getByRole('textbox', { name: 'Caso límite 2' }), 'Pedidos cancelados');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => expect(api.updateSpecification).toHaveBeenCalledOnce());
    const [id, input] = api.updateSpecification.mock.calls[0] ?? [];
    expect(id).toBe(GENERATION.id);
    expect(input).toMatchObject({
      language: 'es',
      specification: {
        title: 'Exportar pedidos y facturas',
        edgeCases: ['Usuario sin pedidos', 'Pedidos cancelados'],
      },
    });
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Exportar pedidos y facturas' }),
    ).toBeTruthy();
  });

  it('does not save an empty field or a story without criteria', async () => {
    api.getGeneration.mockResolvedValue(GENERATION);
    const { user } = renderApp(EDIT_PATH);

    await user.clear(await screen.findByRole('textbox', { name: 'Título' }));
    await user.click(screen.getByRole('button', { name: 'Eliminar Criterio 1' }));
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByText('Este campo no puede estar vacío.')).toBeTruthy();
    expect(screen.getByText('Añade al menos un elemento.')).toBeTruthy();
    expect(api.updateSpecification).not.toHaveBeenCalled();
  });

  it('asks before leaving with unsaved changes', async () => {
    api.getGeneration.mockResolvedValue(GENERATION);
    const { user } = renderApp(EDIT_PATH);

    await user.type(await screen.findByRole('textbox', { name: 'Título' }), ' (borrador)');
    await user.click(screen.getByRole('link', { name: 'Cancelar' }));

    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: 'Seguir editando' }));
    expect(screen.getByRole('textbox', { name: 'Título' })).toBeTruthy();

    await user.click(screen.getByRole('link', { name: 'Cancelar' }));
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', {
        name: 'Salir sin guardar',
      }),
    );
    expect(
      await screen.findByRole('heading', { level: 1, name: specification.title }),
    ).toBeTruthy();
  });
});

// RF-HIS-03
describe('the project history', () => {
  it('opens a generation from its title', async () => {
    vi.mocked(projectService.listProjectGenerations).mockResolvedValue(
      pageOf([generation({ id: GENERATION.id, title: 'Exportar pedidos' })]),
    );
    api.getGeneration.mockResolvedValue(GENERATION);
    const { user } = renderApp(`/projects/${portal.id}`);

    await user.click(await screen.findByRole('link', { name: 'Exportar pedidos' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: specification.title }),
    ).toBeTruthy();
  });

  it('starts a new generation from the project', async () => {
    const { user } = renderApp(`/projects/${portal.id}`);

    await user.click(await screen.findByRole('link', { name: 'Nueva generación' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Nueva generación' })).toBeTruthy();
  });
});
