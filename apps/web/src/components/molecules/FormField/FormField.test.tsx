import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { TextArea } from '../../atoms/TextArea/TextArea';
import { TextInput } from '../../atoms/TextInput/TextInput';
import { FormField } from './FormField';

afterEach(cleanup);

// RNF-10: formularios con etiquetas asociadas.
describe('FormField', () => {
  it('associates the label with its control', () => {
    render(
      <FormField label="Email">{(control) => <TextInput type="email" {...control} />}</FormField>,
    );

    expect(screen.getByLabelText('Email').getAttribute('type')).toBe('email');
  });

  it('works with any control, not only with an input', () => {
    render(<FormField label="Convenciones">{(control) => <TextArea {...control} />}</FormField>);

    expect(screen.getByLabelText('Convenciones').tagName).toBe('TEXTAREA');
  });

  it('marks the control as invalid and points it to its error', () => {
    render(
      <FormField label="Email" error="Escribe un email válido.">
        {(control) => <TextInput {...control} />}
      </FormField>,
    );

    const input = screen.getByLabelText('Email');
    const error = screen.getByText('Escribe un email válido.').closest('p');

    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toBe(error?.id);
  });

  it('shows the hint until there is an error to show instead', () => {
    const field = (error?: string) => (
      <FormField label="Contraseña" hint="8 caracteres o más." error={error}>
        {(control) => <TextInput {...control} />}
      </FormField>
    );
    const { rerender } = render(field());
    const hint = screen.getByText('8 caracteres o más.');

    expect(screen.getByLabelText('Contraseña').getAttribute('aria-describedby')).toBe(hint.id);
    expect(screen.getByLabelText('Contraseña').getAttribute('aria-invalid')).toBeNull();

    rerender(field('Demasiado corta.'));

    expect(screen.queryByText('8 caracteres o más.')).toBeNull();
    expect(screen.getByText('Demasiado corta.')).toBeTruthy();
  });

  it('shows the note and the counter next to the label', () => {
    render(
      <FormField label="Nombre" note="(obligatorio)" counter="18 / 80">
        {(control) => <TextInput {...control} />}
      </FormField>,
    );

    expect(screen.getByLabelText('Nombre (obligatorio)')).toBeTruthy();
    expect(screen.getByText('18 / 80')).toBeTruthy();
  });
});
