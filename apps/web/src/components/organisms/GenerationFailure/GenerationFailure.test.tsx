import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../../i18n';
import { GenerationFailure } from './GenerationFailure';

beforeEach(async () => {
  await i18n.changeLanguage('es');
});

afterEach(cleanup);

// RF-GEN-05
describe('GenerationFailure', () => {
  it('explains the failure and offers to retry', async () => {
    const onRetry = vi.fn();
    render(
      <MemoryRouter>
        <GenerationFailure
          reason="El modelo tardó demasiado."
          retrying={false}
          onRetry={onRetry}
          backTo="/p"
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('El modelo tardó demasiado.')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(onRetry).toHaveBeenCalled();
    expect(screen.getByRole('link', { name: 'Volver al proyecto' }).getAttribute('href')).toBe(
      '/p',
    );
  });

  it('shows why the retry could not start', () => {
    render(
      <MemoryRouter>
        <GenerationFailure
          reason="x"
          retryError="Límite alcanzado"
          retrying={false}
          onRetry={vi.fn()}
          backTo="/p"
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('alert').textContent).toBe('Límite alcanzado');
  });
});
