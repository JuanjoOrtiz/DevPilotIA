import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../../i18n';
import type { SubmitFailure } from '../../../features/forms/submitFailure';
import { GenerationForm } from './GenerationForm';

beforeEach(async () => {
  await i18n.changeLanguage('es');
});

afterEach(cleanup);

function renderForm(result?: SubmitFailure) {
  const onSubmit = vi.fn().mockResolvedValue(result);
  render(
    <MemoryRouter>
      <GenerationForm
        cancelTo="/projects/1"
        onSubmit={onSubmit}
        describeFailure={(failure) => `Fallo: ${failure.code}`}
      />
    </MemoryRouter>,
  );
  return { onSubmit, user: userEvent.setup() };
}

const description = 'Quiero exportar el historial de pedidos a CSV';

// RF-GEN-01
describe('GenerationForm', () => {
  it('starts as a feature and changes the hint with the type', async () => {
    const { user } = renderForm();
    const field = screen.getByRole('textbox', { name: /Descripción/ });

    expect(field.getAttribute('placeholder')).toMatch(/Describe la funcionalidad/);
    await user.click(screen.getByRole('button', { name: 'Bug' }));
    expect(field.getAttribute('placeholder')).toMatch(/Describe el bug/);
  });

  it('counts the characters of the description', async () => {
    const { user } = renderForm();

    await user.type(screen.getByRole('textbox', { name: /Descripción/ }), 'Hola');

    expect(screen.getByText('4 / 4000')).toBeTruthy();
  });

  it('submits what the user wrote', async () => {
    const { onSubmit, user } = renderForm();

    await user.type(screen.getByRole('textbox', { name: /Descripción/ }), description);
    await user.click(screen.getByRole('button', { name: 'Generar especificación' }));

    expect(onSubmit).toHaveBeenCalledWith({
      type: 'feature',
      inputText: description,
      additionalContext: '',
    });
  });

  it('shows a reason of the API on its field and any other failure on top', async () => {
    const { user } = renderForm({
      code: 'VALIDATION_ERROR',
      fields: { inputText: ['INPUT_TOO_LONG'] },
    });
    await user.type(screen.getByRole('textbox', { name: /Descripción/ }), description);
    await user.click(screen.getByRole('button', { name: 'Generar especificación' }));
    expect(
      await screen.findByText('La descripción puede tener 4.000 caracteres como máximo.'),
    ).toBeTruthy();

    cleanup();
    const second = renderForm({ code: 'USER_QUOTA_EXCEEDED', fields: {} });
    await second.user.type(screen.getByRole('textbox', { name: /Descripción/ }), description);
    await second.user.click(screen.getByRole('button', { name: 'Generar especificación' }));
    expect((await screen.findByRole('alert')).textContent).toBe('Fallo: USER_QUOTA_EXCEEDED');
  });
});
