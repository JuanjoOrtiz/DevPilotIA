import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ChoiceGroup } from './ChoiceGroup';

afterEach(cleanup);

const options = [
  { value: 'feature', label: 'Funcionalidad' },
  { value: 'bug', label: 'Bug' },
] as const;

describe('ChoiceGroup', () => {
  it('marks the chosen option as pressed and reports a new choice', async () => {
    const onChange = vi.fn();
    render(<ChoiceGroup legend="Tipo" options={options} value="feature" onChange={onChange} />);

    expect(screen.getByRole('group', { name: 'Tipo' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Funcionalidad' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
    expect(screen.getByRole('button', { name: 'Bug' }).getAttribute('aria-pressed')).toBe('false');

    await userEvent.click(screen.getByRole('button', { name: 'Bug' }));

    expect(onChange).toHaveBeenCalledWith('bug');
  });
});
