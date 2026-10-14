import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../../i18n';
import { GenerationActions } from './GenerationActions';

beforeEach(async () => {
  await i18n.changeLanguage('es');
});

afterEach(cleanup);

function renderActions(hasSpecification: boolean) {
  const handlers = {
    onRegenerate: vi.fn(),
    onExport: vi.fn(),
    onCopy: vi.fn(),
    onDelete: vi.fn(),
  };
  render(
    <MemoryRouter>
      <GenerationActions
        hasSpecification={hasSpecification}
        editTo="/generations/1/edit"
        busy={null}
        {...handlers}
      />
    </MemoryRouter>,
  );
  return handlers;
}

describe('GenerationActions', () => {
  it('offers every action on a specification and calls each handler', async () => {
    const handlers = renderActions(true);
    const user = userEvent.setup();

    expect(screen.getByRole('link', { name: 'Editar' }).getAttribute('href')).toBe(
      '/generations/1/edit',
    );
    await user.click(screen.getByRole('button', { name: 'Regenerar' }));
    await user.click(screen.getByRole('button', { name: 'Exportar a JSON' }));
    await user.click(screen.getByRole('button', { name: 'Copiar Markdown' }));
    await user.click(screen.getByRole('button', { name: 'Eliminar' }));

    expect(handlers.onRegenerate).toHaveBeenCalledOnce();
    expect(handlers.onExport).toHaveBeenCalledWith('json');
    expect(handlers.onCopy).toHaveBeenCalledOnce();
    expect(handlers.onDelete).toHaveBeenCalledOnce();
  });

  it('only offers to delete a generation without specification', () => {
    renderActions(false);

    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual(['Eliminar']);
    expect(screen.queryByRole('link')).toBeNull();
  });
});
