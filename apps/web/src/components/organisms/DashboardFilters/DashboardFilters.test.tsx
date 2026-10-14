import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../../i18n';
import { DashboardFilters } from './DashboardFilters';

beforeEach(async () => {
  await i18n.changeLanguage('es');
});

afterEach(cleanup);

// RF-DAS-06
describe('DashboardFilters', () => {
  it('offers the periods and the projects, and reports each change', async () => {
    const onChange = vi.fn();
    render(
      <DashboardFilters
        days={30}
        projectId={undefined}
        projects={[{ id: 'p1', name: 'Portal de clientes' }]}
        onChange={onChange}
      />,
    );
    const user = userEvent.setup();

    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Últimos 7 días',
      'Últimos 30 días',
      'Últimos 90 días',
      'Todos los proyectos',
      'Portal de clientes',
    ]);

    await user.selectOptions(screen.getByRole('combobox', { name: 'Periodo' }), '90');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Proyecto' }), 'p1');

    expect(onChange).toHaveBeenNthCalledWith(1, { days: 90, projectId: undefined });
    expect(onChange).toHaveBeenNthCalledWith(2, { days: 30, projectId: 'p1' });
  });
});
