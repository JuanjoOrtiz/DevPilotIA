import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Icon } from '../Icon/Icon';
import { StatusBadge } from './StatusBadge';

afterEach(cleanup);

describe('StatusBadge', () => {
  it('shows its label as text', () => {
    render(<StatusBadge tone="success">Completada</StatusBadge>);

    expect(screen.getByText('Completada')).toBeTruthy();
  });

  // RNF-10: el icono es decorativo; quien usa un lector de pantalla recibe solo el texto.
  it('hides its icon from screen readers', () => {
    const { container } = render(
      <StatusBadge tone="danger" icon={<Icon name="alert" size={12} />}>
        Fallida
      </StatusBadge>,
    );

    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    expect(container.textContent).toBe('Fallida');
  });
});
