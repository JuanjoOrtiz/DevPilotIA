import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import i18n from '../../../i18n';
import { specification } from '../../../test/fixtures';
import { SpecificationView } from './SpecificationView';

beforeEach(async () => {
  await i18n.changeLanguage('es');
});

afterEach(cleanup);

// RF-GEN-02 y RF-GEN-10
describe('SpecificationView', () => {
  it('shows the six sections in order, after the assumptions', () => {
    render(<SpecificationView specification={specification} type="feature" />);

    const headings = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(headings).toEqual([
      'Supuestos',
      '01Descripción técnica',
      '02Historias de usuario',
      '03Tareas',
      '04Riesgos y casos límite',
      '05Casos de prueba',
      '06Estimación de complejidad',
    ]);
  });

  it('shows the content of each section as text', () => {
    render(<SpecificationView specification={specification} type="bug" />);

    expect(screen.getByText('Bug')).toBeTruthy();
    expect(screen.getByText(/descargar mis pedidos en CSV/)).toBeTruthy();
    expect(screen.getByText('Botón de exportar')).toBeTruthy();
    expect(screen.getByText('Sin tareas.')).toBeTruthy();
    expect(screen.getByText('Alta')).toBeTruthy();
    expect(screen.getByText('Integración')).toBeTruthy();
    expect(screen.getByText('Uno o dos días')).toBeTruthy();
  });

  it('leaves out the assumptions block when there are none', () => {
    render(
      <SpecificationView specification={{ ...specification, assumptions: [] }} type="feature" />,
    );

    expect(screen.queryByRole('complementary')).toBeNull();
  });

  it('never interprets the model output as HTML (SEG-14)', () => {
    const attack = '<img src=x onerror="alert(1)">';
    const { container } = render(
      <SpecificationView
        specification={{ ...specification, technicalDescription: attack }}
        type="feature"
      />,
    );

    expect(container.querySelector('img')).toBeNull();
    expect(within(container).getByText(attack)).toBeTruthy();
  });
});
