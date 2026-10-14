import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TranslationNotice } from './TranslationNotice';

afterEach(cleanup);

describe('TranslationNotice', () => {
  it('announces the translation in progress', () => {
    render(<TranslationNotice state="translating" message="Traduciendo…" />);

    expect(screen.getByRole('status').textContent).toBe('Traduciendo…');
  });

  it('explains a failure and offers to try again', async () => {
    const onRetry = vi.fn();
    render(
      <TranslationNotice
        state="failed"
        message="No se pudo traducir."
        retryLabel="Reintentar"
        onRetry={onRetry}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(screen.getByRole('alert').textContent).toContain('No se pudo traducir.');
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
