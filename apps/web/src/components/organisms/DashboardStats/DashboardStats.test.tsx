import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import i18n from '../../../i18n';
import { dashboardSummary } from '../../../test/fixtures';
import { DashboardStats } from './DashboardStats';

beforeEach(async () => {
  await i18n.changeLanguage('es');
});

afterEach(cleanup);

// RF-DAS-01
describe('DashboardStats', () => {
  it('uses singular forms for a single generation', () => {
    const { totals } = dashboardSummary();
    render(
      <DashboardStats
        totals={{ ...totals, generations: 2, features: 1, bugs: 1, completed: 1, failed: 1 }}
      />,
    );

    expect(screen.getByText('1 funcionalidad · 1 bug')).toBeTruthy();
    expect(screen.getByText('1 de 2 · 1 fallida')).toBeTruthy();
  });

  it('shows a dash when there is nothing to compute', () => {
    const { totals } = dashboardSummary();
    render(
      <DashboardStats totals={{ ...totals, completionRate: null, averageDurationMs: null }} />,
    );

    expect(screen.getAllByText('—')).toHaveLength(2);
  });
});
