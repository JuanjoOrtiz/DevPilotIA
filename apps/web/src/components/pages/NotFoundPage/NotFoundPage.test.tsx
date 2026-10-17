import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import i18n from '../../../i18n';
import { ROUTES } from '../../../routes';
import { NotFoundPage } from './NotFoundPage';

beforeEach(async () => {
  await i18n.changeLanguage('es');
});

afterEach(cleanup);

describe('NotFoundPage', () => {
  it('says the address does not exist and offers a way back to the dashboard', () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Página no encontrada' })).toBeTruthy();
    expect(screen.getByText('404')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Ir al dashboard' }).getAttribute('href')).toBe(
      ROUTES.dashboard,
    );
  });

  it('is translated to English', async () => {
    await i18n.changeLanguage('en');
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Go to the dashboard' })).toBeTruthy();
  });
});
