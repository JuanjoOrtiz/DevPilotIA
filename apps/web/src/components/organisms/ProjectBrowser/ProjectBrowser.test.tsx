import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import i18n from '../../../i18n';
import { portal, reservas } from '../../../test/fixtures';
import { ProjectBrowser } from './ProjectBrowser';

beforeEach(async () => {
  await i18n.changeLanguage('es');
});

afterEach(cleanup);

const facturacion = { ...portal, id: 'f', name: 'API de facturación', generationCount: 0 };

function renderBrowser() {
  render(
    <MemoryRouter>
      <ProjectBrowser projects={[portal, reservas, facturacion]} />
    </MemoryRouter>,
  );
  return userEvent.setup();
}

const names = () => screen.getAllByRole('heading', { level: 2 }).map((name) => name.textContent);

// RF-PRO-02
describe('ProjectBrowser', () => {
  it('shows on each card the generations and the last activity of the project', () => {
    renderBrowser();

    const card = screen.getByRole('link', { name: 'Portal de clientes' }).closest('li');
    const scope = within(card as HTMLElement);

    expect(scope.getByText(/Área privada/)).toBeTruthy();
    expect(
      within(scope.getByRole('list', { name: 'Stack' })).getAllByRole('listitem'),
    ).toHaveLength(3);
    expect(scope.getByText('11').parentElement?.textContent).toBe('11 generaciones');
    expect(scope.getByText('Última actividad: 10 oct 2026')).toBeTruthy();
    expect(screen.getByText('1').parentElement?.textContent).toBe('1 generación');
  });

  it('links each project to its page', () => {
    renderBrowser();

    expect(screen.getByRole('link', { name: 'App de reservas' }).getAttribute('href')).toBe(
      `/projects/${reservas.id}`,
    );
  });

  it('keeps the order it receives and counts the projects', () => {
    renderBrowser();

    expect(names()).toEqual(['Portal de clientes', 'App de reservas', 'API de facturación']);
    expect(screen.getByRole('status').textContent).toBe('3 proyectos');
  });

  it('searches by name, ignoring case and accents', async () => {
    const user = renderBrowser();

    await user.type(screen.getByLabelText('Buscar por nombre'), 'FACTURACION');

    expect(names()).toEqual(['API de facturación']);
    expect(screen.getByRole('status').textContent).toBe('1 proyecto');
  });

  it('says so when no project matches, and recovers the list when the search is cleared', async () => {
    const user = renderBrowser();
    const search = screen.getByLabelText('Buscar por nombre');

    await user.type(search, 'nada parecido');
    expect(screen.getByText('Ningún proyecto coincide con «nada parecido».')).toBeTruthy();
    expect(screen.queryByRole('heading', { level: 2 })).toBeNull();

    await user.clear(search);
    expect(names()).toHaveLength(3);
  });
});
