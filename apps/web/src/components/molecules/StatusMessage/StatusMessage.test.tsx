import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { StatusMessage } from './StatusMessage';

afterEach(cleanup);

describe('StatusMessage', () => {
  it('announces the confirmation', () => {
    render(<StatusMessage>Copiado.</StatusMessage>);

    expect(screen.getByRole('status').textContent).toBe('Copiado.');
  });
});
