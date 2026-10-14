import { cleanup, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../i18n';
import { ApiError } from '../../services/apiClient';
import * as authService from '../../services/authService';
import * as dashboardService from '../../services/dashboardService';
import * as projectService from '../../services/projectService';
import { dashboardSummary } from '../../test/fixtures';
import { lucia, renderApp } from '../../test/renderApp';

vi.mock('../../services/authService');
vi.mock('../../services/dashboardService');
vi.mock('../../services/projectService');

const api = vi.mocked(dashboardService);

beforeEach(async () => {
  await i18n.changeLanguage('es');
  vi.mocked(authService.restoreSession).mockResolvedValue(lucia);
  vi.mocked(projectService.listProjects).mockResolvedValue([]);
});

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

const indicator = (label: string) => {
  const term = screen.getByText(label, { selector: 'dt' });
  const card = term.parentElement as HTMLElement;
  return within(card)
    .getAllByRole('definition')
    .map((item) => item.textContent);
};

// RF-DAS-01 a 03
describe('the dashboard', () => {
  it('is the page that opens after signing in', async () => {
    api.getDashboardSummary.mockResolvedValue(dashboardSummary());
    renderApp('/');

    expect(
      await screen.findByRole('heading', { name: 'Dashboard', level: 1 }, { timeout: 5000 }),
    ).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Dashboard' }).getAttribute('aria-current')).toBe(
      'page',
    );
  });

  it('shows the four indicators', async () => {
    api.getDashboardSummary.mockResolvedValue(dashboardSummary());
    renderApp('/dashboard');
    await screen.findByRole('region', { name: 'Indicadores' });

    expect(indicator('Proyectos')).toEqual(['3', 'en total']);
    expect(indicator('Generaciones')).toEqual(['25', '15 funcionalidades · 10 bugs']);
    expect(indicator('Completadas')[0]).toMatch(/^88\s%$/);
    expect(indicator('Completadas')[1]).toBe('22 de 25 · 3 fallidas');
    expect(indicator('Tiempo medio de generación')[0]).toMatch(/^12,4\ss$/);
  });

  it('describes the period and both charts for screen readers', async () => {
    api.getDashboardSummary.mockResolvedValue(dashboardSummary());
    renderApp('/dashboard');

    expect(
      await screen.findByText('Del 13 de septiembre de 2026 al 12 de octubre de 2026'),
    ).toBeTruthy();
    expect(screen.getByText('4 generaciones en los últimos 30 días')).toBeTruthy();
    expect(
      screen.getByRole('img', {
        name: 'Gráfica de barras: generaciones por día del 13 de septiembre de 2026 al 12 de octubre de 2026. Máximo de 3 el 23 de septiembre de 2026.',
      }),
    ).toBeTruthy();
    expect(screen.getByText('22 generaciones completadas')).toBeTruthy();
    expect(
      screen.getByRole('img', {
        name: 'Gráfica de barras por complejidad: S 5, M 9, L 6, XL 2.',
      }),
    ).toBeTruthy();
    // RF-DAS-04
    expect(
      screen.getByRole('img', {
        name: 'Barras horizontales: Portal de clientes 11, App de reservas 9.',
      }),
    ).toBeTruthy();
  });

  it('invites to create the first generation when there is no data', async () => {
    api.getDashboardSummary.mockResolvedValue(
      dashboardSummary({
        totals: {
          projects: 0,
          generations: 0,
          features: 0,
          bugs: 0,
          completed: 0,
          failed: 0,
          completionRate: null,
          averageDurationMs: null,
        },
      }),
    );
    const { user } = renderApp('/dashboard');

    await user.click(await screen.findByRole('link', { name: 'Ir a proyectos' }));

    expect(await screen.findByRole('heading', { name: 'Proyectos', level: 1 })).toBeTruthy();
  });

  it('explains a failure and tries again', async () => {
    api.getDashboardSummary
      .mockRejectedValueOnce(new ApiError('NETWORK_ERROR'))
      .mockResolvedValue(dashboardSummary());
    const { user } = renderApp('/dashboard');

    await user.click(await screen.findByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByRole('region', { name: 'Indicadores' })).toBeTruthy();
  });

  // RNF-14
  it('switches to English with its own number formats', async () => {
    api.getDashboardSummary.mockResolvedValue(dashboardSummary());
    const { user } = renderApp('/dashboard');
    await screen.findByRole('region', { name: 'Indicadores' });

    await user.click(screen.getByRole('button', { name: 'EN' }));

    expect(await screen.findByText('From September 13, 2026 to October 12, 2026')).toBeTruthy();
    expect(indicator('Completed')).toEqual(['88%', '22 of 25 · 3 failed']);
    expect(indicator('Generations')[1]).toBe('15 features · 10 bugs');
  });
});
