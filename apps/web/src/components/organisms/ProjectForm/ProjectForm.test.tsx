import type { CreateProjectRequest } from '@devpilot/shared';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SubmitFailure } from '../../../features/forms/submitFailure';
import i18n from '../../../i18n';
import { ProjectForm } from './ProjectForm';

beforeEach(async () => {
  await i18n.changeLanguage('es');
});

afterEach(cleanup);

function renderForm(result?: SubmitFailure, initialValues?: CreateProjectRequest) {
  const onSubmit = vi.fn<(values: CreateProjectRequest) => Promise<SubmitFailure | undefined>>();
  onSubmit.mockResolvedValue(result);
  render(
    <MemoryRouter>
      <ProjectForm
        {...(initialValues ? { initialValues } : {})}
        submitLabel="Crear proyecto"
        submittingLabel="Creando el proyecto…"
        cancelTo="/projects"
        onSubmit={onSubmit}
      />
    </MemoryRouter>,
  );
  return { onSubmit, user: userEvent.setup() };
}

const submit = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole('button', { name: 'Crear proyecto' }));

// RF-PRO-01
describe('ProjectForm', () => {
  it('submits the name, the description, the stack and the conventions', async () => {
    const { onSubmit, user } = renderForm();

    await user.type(screen.getByLabelText('Nombre (obligatorio)'), '  Portal de clientes ');
    await user.type(screen.getByLabelText('Descripción'), 'Área privada');
    await user.type(screen.getByLabelText('Stack tecnológico'), 'React{Enter}Node.js{Enter}');
    await user.type(screen.getByLabelText('Convenciones'), 'Tests con Vitest');
    await submit(user);

    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Portal de clientes',
      description: 'Área privada',
      techStack: ['React', 'Node.js'],
      conventions: 'Tests con Vitest',
    });
  });

  it('needs only a name', async () => {
    const { onSubmit, user } = renderForm();

    await user.type(screen.getByLabelText('Nombre (obligatorio)'), 'API de pagos');
    await submit(user);

    expect(onSubmit).toHaveBeenCalledWith({
      name: 'API de pagos',
      description: '',
      techStack: [],
      conventions: '',
    });
  });

  it('asks for a name before sending anything', async () => {
    const { onSubmit, user } = renderForm();

    await submit(user);

    expect(await screen.findByText('Escribe un nombre para el proyecto.')).toBeTruthy();
    expect(screen.getByLabelText('Nombre (obligatorio)').getAttribute('aria-invalid')).toBe('true');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('counts the characters of each field and stops a text that is too long', async () => {
    const { onSubmit, user } = renderForm();

    await user.type(screen.getByLabelText('Nombre (obligatorio)'), 'Portal');
    expect(screen.getByText('6 / 80')).toBeTruthy();
    expect(screen.getByText('0 / 500')).toBeTruthy();
    expect(screen.getByText('0 / 15')).toBeTruthy();
    expect(screen.getByText('0 / 2000')).toBeTruthy();

    await user.click(screen.getByLabelText('Descripción'));
    await user.paste('x'.repeat(501));
    await submit(user);

    expect(
      await screen.findByText('La descripción puede tener 500 caracteres como máximo.'),
    ).toBeTruthy();
    expect(screen.getByText('501 / 500')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('does not accept more than fifteen technologies', async () => {
    const { onSubmit, user } = renderForm();
    const stack = Array.from({ length: 16 }, (_, index) => `tag-${index}{Enter}`).join('');

    await user.type(screen.getByLabelText('Nombre (obligatorio)'), 'API');
    await user.type(screen.getByLabelText('Stack tecnológico'), stack);
    await submit(user);

    expect(await screen.findByText('Puedes añadir 15 tecnologías como máximo.')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Quitar tag-15' }));
    await submit(user);

    expect(onSubmit).toHaveBeenCalledOnce();
  });

  // RF-PRO-04: al editar, el formulario empieza con los datos del proyecto.
  it('starts with the values of the project when editing', async () => {
    const { onSubmit, user } = renderForm(undefined, {
      name: 'Portal de clientes',
      description: 'Área privada',
      techStack: ['React', 'Node.js'],
      conventions: 'Tests con Vitest',
    });

    expect((screen.getByLabelText('Nombre (obligatorio)') as HTMLInputElement).value).toBe(
      'Portal de clientes',
    );
    expect(screen.getByText('2 / 15')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Quitar React' }));
    await submit(user);

    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Portal de clientes',
      description: 'Área privada',
      techStack: ['Node.js'],
      conventions: 'Tests con Vitest',
    });
  });

  it('shows on each field what the API rejects', async () => {
    const { user } = renderForm({
      code: 'VALIDATION_ERROR',
      fields: { name: ['PROJECT_NAME_TOO_LONG'], 'techStack.0': ['TAG_TOO_LONG'] },
    });

    await user.type(screen.getByLabelText('Nombre (obligatorio)'), 'API');
    await submit(user);

    expect(
      await screen.findByText('El nombre puede tener 80 caracteres como máximo.'),
    ).toBeTruthy();
    expect(screen.getByText('Cada tecnología puede tener 30 caracteres como máximo.')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('shows above the form an error that belongs to no field', async () => {
    const { user } = renderForm({ code: 'NETWORK_ERROR', fields: {} });

    await user.type(screen.getByLabelText('Nombre (obligatorio)'), 'API');
    await submit(user);

    expect((await screen.findByRole('alert')).textContent).toBe(
      'No se pudo contactar con el servidor. Comprueba tu conexión e inténtalo de nuevo.',
    );
  });

  it('offers a way out that does not save anything', () => {
    renderForm();

    expect(screen.getByRole('link', { name: 'Cancelar' }).getAttribute('href')).toBe('/projects');
  });
});
