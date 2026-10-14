import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { StatCard } from './StatCard';

afterEach(cleanup);

describe('StatCard', () => {
  it('shows the label, the value and the detail as a term and its description', () => {
    render(
      <dl>
        <StatCard label="Completadas" value="88 %" detail="22 de 25" />
      </dl>,
    );

    expect(screen.getByRole('term').textContent).toBe('Completadas');
    expect(screen.getAllByRole('definition').map((item) => item.textContent)).toEqual([
      '88 %',
      '22 de 25',
    ]);
  });

  it('leaves out the detail when there is none', () => {
    render(
      <dl>
        <StatCard label="Proyectos" value="3" />
      </dl>,
    );

    expect(screen.getAllByRole('definition')).toHaveLength(1);
  });
});
