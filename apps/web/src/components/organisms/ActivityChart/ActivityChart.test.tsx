import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import i18n from '../../../i18n';
import { dashboardSummary } from '../../../test/fixtures';
import { ActivityChart } from './ActivityChart';

beforeEach(async () => {
  await i18n.changeLanguage('es');
});

afterEach(cleanup);

// RF-DAS-02
describe('ActivityChart', () => {
  it('says so when there was no activity in the period', () => {
    const activity = dashboardSummary().activity.map((day) => ({ ...day, count: 0 }));
    render(<ActivityChart activity={activity} />);

    expect(screen.getByText('0 generaciones en el periodo')).toBeTruthy();
    expect(
      screen.getByRole('img', {
        name: 'Gráfica de barras: ninguna generación del 13 de septiembre de 2026 al 12 de octubre de 2026.',
      }),
    ).toBeTruthy();
  });
});
