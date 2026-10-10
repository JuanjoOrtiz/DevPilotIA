import type { HealthResponse } from '@devpilot/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../../i18n';
import { fetchHealth } from '../../../services/healthService';
import { HomePage } from './HomePage';

vi.mock('../../../services/healthService');

function renderPage(health: HealthResponse) {
  vi.mocked(fetchHealth).mockResolvedValue(health);
  render(
    <QueryClientProvider client={new QueryClient()}>
      <HomePage />
    </QueryClientProvider>,
  );
}

beforeEach(async () => {
  await i18n.changeLanguage('es');
});

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe('HomePage', () => {
  it('shows the server as operational when the API and the database respond', async () => {
    renderPage({ status: 'ok', database: 'up', version: 'abc123' });

    expect(await screen.findByText('Operativo')).toBeTruthy();
    expect(screen.getByText('Versión abc123')).toBeTruthy();
  });

  it('says the database is unavailable when the API reports it', async () => {
    renderPage({ status: 'degraded', database: 'down', version: 'abc123' });

    expect(await screen.findByText('Base de datos no disponible')).toBeTruthy();
  });

  it('switches the interface to English', async () => {
    renderPage({ status: 'ok', database: 'up', version: 'abc123' });
    await screen.findByText('Operativo');

    fireEvent.click(screen.getByRole('button', { name: 'EN' }));

    expect(await screen.findByText('Operational')).toBeTruthy();
    expect(document.documentElement.lang).toBe('en');
  });
});
