import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SubmitFailure } from '../../../features/auth/submitFailure';
import i18n from '../../../i18n';
import { LoginForm } from './LoginForm';

beforeEach(async () => {
  await i18n.changeLanguage('es');
});

afterEach(cleanup);

function setup(result?: SubmitFailure) {
  const onSubmit = vi.fn().mockResolvedValue(result);
  render(<LoginForm onSubmit={onSubmit} />);
  return { onSubmit, user: userEvent.setup() };
}

describe('LoginForm', () => {
  it('submits the email, normalised, and the password', async () => {
    const { onSubmit, user } = setup();

    await user.type(screen.getByLabelText('Email'), ' Lucia@Example.com ');
    await user.type(screen.getByLabelText('Contraseña'), 'correct horse');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(onSubmit).toHaveBeenCalledWith({
      email: 'lucia@example.com',
      password: 'correct horse',
    });
  });

  it('explains what is wrong with each field and does not submit', async () => {
    const { onSubmit, user } = setup();

    await user.type(screen.getByLabelText('Email'), 'not-an-email');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('Escribe un email válido.')).toBeTruthy();
    expect(screen.getByText('Escribe tu contraseña.')).toBeTruthy();
    expect(screen.getByLabelText('Email').getAttribute('aria-invalid')).toBe('true');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  // RF-AUT-02: el mensaje es genérico y no revela si el email existe.
  it('shows a generic message when the credentials are rejected', async () => {
    const { user } = setup({ code: 'INVALID_CREDENTIALS', fields: {} });

    await user.type(screen.getByLabelText('Email'), 'lucia@example.com');
    await user.type(screen.getByLabelText('Contraseña'), 'wrong password');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect((await screen.findByRole('alert')).textContent).toBe(
      'El email o la contraseña no son correctos.',
    );
  });

  it('cannot be sent twice while the first attempt is in progress', async () => {
    let finish: (value: undefined) => void = () => undefined;
    const onSubmit = vi.fn(() => new Promise<undefined>((resolve) => (finish = resolve)));
    render(<LoginForm onSubmit={onSubmit} />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText('Email'), 'lucia@example.com');
    await user.type(screen.getByLabelText('Contraseña'), 'correct horse');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    const busy = await screen.findByRole('button', { name: 'Entrando…' });
    expect(busy.hasAttribute('disabled')).toBe(true);
    await user.click(busy);
    expect(onSubmit).toHaveBeenCalledOnce();

    finish(undefined);
    expect(await screen.findByRole('button', { name: 'Entrar' })).toBeTruthy();
  });
});
