import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { StatusBadge } from './StatusBadge';

afterEach(cleanup);

describe('StatusBadge', () => {
  it('shows its label as text', () => {
    render(<StatusBadge tone="success">Operativo</StatusBadge>);

    expect(screen.getByText('Operativo')).toBeTruthy();
  });
});
