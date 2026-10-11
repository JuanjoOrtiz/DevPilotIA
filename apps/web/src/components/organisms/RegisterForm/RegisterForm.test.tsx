import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SubmitFailure } from '../../../features/auth/submitFailure';
import i18n from '../../../i18n';
import { RegisterForm } from './RegisterForm';

beforeEach(async () => {
  await i18n.changeLanguage('es');
});

afterEach(cleanup);

async function fillAndSubmit(result?: SubmitFailure, password = 'correct horse battery') {
  const onSubmit = vi.fn().mockResolvedValue(result);
  render(<RegisterForm onSubmit={onSubmit} />);
  const user = userEvent.setup();

  await user.type(screen.getByLabelText('Nombre'), 'Lucía Ferrer');
  await user.type(screen.getByLabelText('Email'), 'lucia@example.com');
  await user.type(screen.getByLabelText('Contraseña'), password);
  await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));

  return { onSubmit };
}

// RF-AUT-01
describe('RegisterForm', () => {
  it('submits name, email and password', async () => {
    const { onSubmit } = await fillAndSubmit();

    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Lucía Ferrer',
      email: 'lucia@example.com',
      password: 'correct horse battery',
    });
  });

  it('asks for a password of 8 characters or more before sending anything', async () => {
    const { onSubmit } = await fillAndSubmit(undefined, 'abc123');

    expect(await screen.findByText('La contraseña debe tener 8 caracteres o más.')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows on the email field that the email already has an account', async () => {
    await fillAndSubmit({
      code: 'EMAIL_ALREADY_REGISTERED',
      fields: { email: ['EMAIL_ALREADY_REGISTERED'] },
    });

    const message = await screen.findByText('Ya existe una cuenta con este email.');
    const email = screen.getByLabelText('Email');

    expect(email.getAttribute('aria-invalid')).toBe('true');
    expect(email.getAttribute('aria-describedby')).toBe(message.closest('p')?.id);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('shows the fields the API rejects even if the browser accepted them', async () => {
    await fillAndSubmit({
      code: 'VALIDATION_ERROR',
      fields: { name: ['NAME_TOO_LONG'], password: ['A_RULE_ADDED_LATER'] },
    });

    expect(
      await screen.findByText('El nombre puede tener 80 caracteres como máximo.'),
    ).toBeTruthy();
    expect(screen.getByText('Este valor no es válido.')).toBeTruthy();
  });

  it('shows a general message when the failure is not about a field', async () => {
    await fillAndSubmit({ code: 'NETWORK_ERROR', fields: {} });

    expect((await screen.findByRole('alert')).textContent).toContain(
      'No se pudo contactar con el servidor.',
    );
  });
});
