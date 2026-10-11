import { cleanup, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from './i18n';
import { ApiError } from './services/apiClient';
import * as authService from './services/authService';
import { fetchHealth } from './services/healthService';
import { lucia, renderApp } from './test/renderApp';

vi.mock('./services/authService');
vi.mock('./services/healthService');

const auth = vi.mocked(authService);

beforeEach(async () => {
  await i18n.changeLanguage('es');
  vi.mocked(fetchHealth).mockResolvedValue({ status: 'ok', database: 'up', version: 'abc123' });
  auth.restoreSession.mockResolvedValue(null);
  auth.logout.mockResolvedValue(undefined);
});

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

const loginHeading = () => screen.findByRole('heading', { name: 'Iniciar sesión' });
const homeHeading = () => screen.findByRole('heading', { name: 'Hola, Lucía Ferrer' });

// RF-AUT-05: sin sesión se redirige al login.
describe('routes without a session', () => {
  it('sends a visitor to the login page', async () => {
    renderApp('/');

    expect(await loginHeading()).toBeTruthy();
    expect(screen.queryByText(/Hola,/)).toBeNull();
  });

  it('sends any unknown address to the login page too', async () => {
    renderApp('/projects/123');

    expect(await loginHeading()).toBeTruthy();
  });

  it('shows nothing of the application while the session is being checked', () => {
    auth.restoreSession.mockReturnValue(new Promise(() => undefined));

    renderApp('/');

    expect(screen.getByRole('status').textContent).toBe('Cargando…');
    expect(screen.queryByRole('heading')).toBeNull();
  });

  it('lets the visitor go from login to registration and back', async () => {
    const { user } = renderApp('/login');

    await user.click(await screen.findByRole('link', { name: 'Crear cuenta' }));
    expect(await screen.findByRole('heading', { name: 'Crear cuenta' })).toBeTruthy();

    await user.click(screen.getByRole('link', { name: 'Iniciar sesión' }));
    expect(await loginHeading()).toBeTruthy();
  });
});

describe('signing in', () => {
  // RF-AUT-02
  it('opens the application after a successful login', async () => {
    auth.login.mockResolvedValue(lucia);
    const { user } = renderApp('/login');

    await user.type(await screen.findByLabelText('Email'), 'lucia@example.com');
    await user.type(screen.getByLabelText('Contraseña'), 'correct horse battery');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await homeHeading()).toBeTruthy();
    expect(auth.login).toHaveBeenCalledWith({
      email: 'lucia@example.com',
      password: 'correct horse battery',
    });
  });

  it('stays on the login page with a generic message when the credentials are wrong', async () => {
    auth.login.mockRejectedValue(new ApiError('INVALID_CREDENTIALS', 401));
    const { user } = renderApp('/login');

    await user.type(await screen.findByLabelText('Email'), 'lucia@example.com');
    await user.type(screen.getByLabelText('Contraseña'), 'wrong password');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect((await screen.findByRole('alert')).textContent).toBe(
      'El email o la contraseña no son correctos.',
    );
    expect(screen.getByRole('heading', { name: 'Iniciar sesión' })).toBeTruthy();
  });

  // RF-AUT-01: tras registrarse, la sesión queda iniciada.
  it('opens the application right after registering', async () => {
    auth.register.mockResolvedValue(lucia);
    const { user } = renderApp('/register');

    await user.type(await screen.findByLabelText('Nombre'), 'Lucía Ferrer');
    await user.type(screen.getByLabelText('Email'), 'lucia@example.com');
    await user.type(screen.getByLabelText('Contraseña'), 'correct horse battery');
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect(await homeHeading()).toBeTruthy();
  });

  it('shows on the email field that the email is taken', async () => {
    auth.register.mockRejectedValue(
      new ApiError('EMAIL_ALREADY_REGISTERED', 409, {
        fields: { email: ['EMAIL_ALREADY_REGISTERED'] },
      }),
    );
    const { user } = renderApp('/register');

    await user.type(await screen.findByLabelText('Nombre'), 'Lucía Ferrer');
    await user.type(screen.getByLabelText('Email'), 'lucia@example.com');
    await user.type(screen.getByLabelText('Contraseña'), 'correct horse battery');
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect(await screen.findByText('Ya existe una cuenta con este email.')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Crear cuenta' })).toBeTruthy();
  });
});

describe('routes with a session', () => {
  beforeEach(() => {
    auth.restoreSession.mockResolvedValue(lucia);
  });

  // RF-AUT-03: al recargar, la sesión se recupera sin volver a pedir la contraseña.
  it('recovers the session when the page loads', async () => {
    renderApp('/');

    expect(await homeHeading()).toBeTruthy();
    expect(await screen.findByText('Operativo')).toBeTruthy();
    expect(auth.login).not.toHaveBeenCalled();
  });

  it('takes a signed-in user away from the login and registration pages', async () => {
    renderApp('/login');

    expect(await homeHeading()).toBeTruthy();
  });

  // RF-AUT-04
  it('returns to the login page after signing out', async () => {
    const { user } = renderApp('/');

    await user.click(await screen.findByRole('button', { name: 'Cerrar sesión' }));

    expect(await loginHeading()).toBeTruthy();
    expect(auth.logout).toHaveBeenCalledOnce();
    expect(screen.queryByText('La sesión ha caducado. Vuelve a iniciar sesión.')).toBeNull();
  });

  it('signs out in this tab even if the server cannot be told', async () => {
    auth.logout.mockRejectedValue(new ApiError('NETWORK_ERROR'));
    const { user } = renderApp('/');

    await user.click(await screen.findByRole('button', { name: 'Cerrar sesión' }));

    expect(await loginHeading()).toBeTruthy();
  });

  // SEG-05: el texto del usuario se muestra siempre como texto, nunca como HTML.
  it('shows a name that contains markup as plain text', async () => {
    const name = '<img src=x onerror="alert(1)">';
    auth.restoreSession.mockResolvedValue({ ...lucia, name });
    const { container } = renderApp('/');

    expect(await screen.findByRole('heading', { name: `Hola, ${name}` })).toBeTruthy();
    expect(container.querySelector('img')).toBeNull();
  });

  it('switches the interface to English', async () => {
    const { user } = renderApp('/');
    await homeHeading();

    await user.click(screen.getByRole('button', { name: 'EN' }));

    expect(await screen.findByRole('heading', { name: 'Hello, Lucía Ferrer' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeTruthy();
    await waitFor(() => expect(document.documentElement.lang).toBe('en'));
  });
});
