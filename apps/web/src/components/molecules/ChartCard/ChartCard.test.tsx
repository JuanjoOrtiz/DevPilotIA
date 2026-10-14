import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ChartCard } from './ChartCard';

afterEach(cleanup);

describe('ChartCard', () => {
  it('gives the chart its title and an accessible summary', () => {
    render(
      <ChartCard title="Generaciones por día" description="25 en 30 días" summary="Máximo de 3">
        <svg />
      </ChartCard>,
    );

    expect(screen.getByRole('heading', { name: 'Generaciones por día', level: 2 })).toBeTruthy();
    expect(screen.getByText('25 en 30 días')).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Máximo de 3' })).toBeTruthy();
  });
});
