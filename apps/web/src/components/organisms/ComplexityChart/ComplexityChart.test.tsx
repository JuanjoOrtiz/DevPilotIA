import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import i18n from '../../../i18n';
import { dashboardSummary } from '../../../test/fixtures';
import { ComplexityChart } from './ComplexityChart';

beforeEach(async () => {
  await i18n.changeLanguage('es');
});

afterEach(cleanup);

// RF-DAS-03
describe('ComplexityChart', () => {
  it('counts the completed generations and reads every size', () => {
    render(<ComplexityChart complexity={dashboardSummary().complexity} />);

    expect(screen.getByText('22 generaciones completadas')).toBeTruthy();
    expect(
      screen.getByRole('img', { name: 'Gráfica de barras por complejidad: S 5, M 9, L 6, XL 2.' }),
    ).toBeTruthy();
  });
});
