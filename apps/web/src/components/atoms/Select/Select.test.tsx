import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Select } from './Select';

afterEach(cleanup);

describe('Select', () => {
  it('lets the user pick an option and marks itself invalid when asked', async () => {
    const onChange = vi.fn();
    render(
      <Select aria-label="Periodo" defaultValue="30" invalid onChange={onChange}>
        <option value="7">7</option>
        <option value="30">30</option>
      </Select>,
    );

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Periodo' }), '7');

    expect(onChange).toHaveBeenCalledOnce();
    expect(screen.getByRole('combobox').getAttribute('aria-invalid')).toBe('true');
  });
});
