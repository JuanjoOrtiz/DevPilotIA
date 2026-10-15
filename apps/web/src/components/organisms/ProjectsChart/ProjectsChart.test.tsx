import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import i18n from '../../../i18n';
import { dashboardSummary } from '../../../test/fixtures';
import { ProjectsChart } from './ProjectsChart';

beforeEach(async () => {
  await i18n.changeLanguage('es');
});

afterEach(cleanup);

// RF-DAS-04
describe('ProjectsChart', () => {
  it('reads each project with its count and draws the bars relative to the busiest', () => {
    const { container } = render(
      <MemoryRouter>
        <ProjectsChart projects={dashboardSummary().projects} projectPath={(id) => `/p/${id}`} />
      </MemoryRouter>,
    );

    expect(screen.getAllByRole('link').map((link) => link.getAttribute('aria-label'))).toEqual([
      'Portal de clientes: 11 generaciones',
      'App de reservas: 9 generaciones',
    ]);
    expect(screen.getByRole('link', { name: 'Portal de clientes: 11 generaciones' })).toBeTruthy();
    const widths = [...container.querySelectorAll<HTMLElement>('li div[style]')].map(
      (bar) => bar.style.width,
    );
    expect(widths[0]).toBe('100%');
    expect(Number.parseFloat(widths[1] ?? '0')).toBeCloseTo(81.8, 1);
  });
});
