import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { TextField } from './TextField';

afterEach(cleanup);

// RNF-10: formularios con etiquetas asociadas.
describe('TextField', () => {
  it('associates the label with its input', () => {
    render(<TextField label="Email" type="email" />);

    expect(screen.getByLabelText('Email').getAttribute('type')).toBe('email');
  });

  it('marks the input as invalid and points it to its error', () => {
    render(<TextField label="Email" error="Escribe un email válido." />);

    const input = screen.getByLabelText('Email');
    const error = screen.getByText('Escribe un email válido.').closest('p');

    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toBe(error?.id);
  });

  it('shows the hint until there is an error to show instead', () => {
    const { rerender } = render(<TextField label="Contraseña" hint="8 caracteres o más." />);
    const hint = screen.getByText('8 caracteres o más.');

    expect(screen.getByLabelText('Contraseña').getAttribute('aria-describedby')).toBe(hint.id);
    expect(screen.getByLabelText('Contraseña').getAttribute('aria-invalid')).toBeNull();

    rerender(<TextField label="Contraseña" hint="8 caracteres o más." error="Demasiado corta." />);

    expect(screen.queryByText('8 caracteres o más.')).toBeNull();
    expect(screen.getByText('Demasiado corta.')).toBeTruthy();
  });
});
