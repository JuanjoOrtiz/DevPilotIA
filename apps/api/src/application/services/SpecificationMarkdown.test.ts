import type { Specification } from '@devpilot/shared';
import { describe, expect, it } from 'vitest';
import { sampleSpecification } from '../../test-support/llm.js';
import { exportFileName, specificationToMarkdown } from './SpecificationMarkdown.js';

// RF-EXP-01
describe('specificationToMarkdown', () => {
  it('writes the title, the six sections and the assumptions', () => {
    const markdown = specificationToMarkdown(sampleSpecification, 'feature', 'es');

    expect(markdown.startsWith('# Exportar el historial de pedidos a CSV\n')).toBe(true);
    expect(markdown).toContain('> Funcionalidad · Complejidad: M');
    for (const heading of [
      '## Supuestos',
      '## Descripción técnica',
      '## Historias de usuario',
      '## Tareas',
      '## Riesgos y casos límite',
      '## Casos de prueba',
      '## Estimación de complejidad',
    ]) {
      expect(markdown).toContain(`\n${heading}\n`);
    }
  });

  it('writes tasks and acceptance criteria as checkbox lists', () => {
    const markdown = specificationToMarkdown(sampleSpecification, 'feature', 'es');

    expect(markdown).toContain('- [ ] El fichero incluye fecha, importe y estado');
    expect(markdown).toContain('- [ ] **Botón de exportar**: En la lista de pedidos, con React');
    expect(markdown).toContain('- [ ] **Endpoint de exportación**: GET /orders/export');
  });

  it('numbers the steps of each test case and gives its expected result', () => {
    const markdown = specificationToMarkdown(sampleSpecification, 'feature', 'es');

    expect(markdown).toContain('### Exporta los pedidos (integración)');
    expect(markdown).toContain('1. Crear dos pedidos\n2. Pedir la exportación');
    expect(markdown).toContain('Resultado esperado: Un CSV con dos filas');
  });

  it('uses the headings of the interface language', () => {
    const markdown = specificationToMarkdown(sampleSpecification, 'bug', 'en');

    expect(markdown).toContain('> Bug · Complexity: M');
    expect(markdown).toContain('\n## Technical description\n');
    expect(markdown).toContain('\n**Acceptance criteria**\n');
    expect(markdown).toContain('**M** (one or two days). Un endpoint y un botón');
  });

  it('says so when a list is empty and keeps line breaks out of list items', () => {
    const sparse: Specification = {
      ...sampleSpecification,
      assumptions: [],
      tasks: { frontend: [], backend: sampleSpecification.tasks.backend },
      risks: [],
      edgeCases: ['Dos líneas\nen un caso'],
      testCases: [],
    };

    const markdown = specificationToMarkdown(sparse, 'feature', 'es');

    expect(markdown).not.toContain('## Supuestos');
    expect(markdown).toContain('### Frontend\n\n_Sin tareas._');
    expect(markdown).toContain('_Sin riesgos identificados._');
    expect(markdown).toContain('- Dos líneas en un caso');
    expect(markdown).toContain('_Sin casos de prueba._');
    expect(markdown.endsWith('\n')).toBe(true);
    expect(markdown).not.toMatch(/\n{3,}/);
  });
});

describe('exportFileName', () => {
  it('turns the title into a safe ASCII file name', () => {
    expect(exportFileName('Exportar el historial: ¿pedidos "y" facturas?', 'md')).toBe(
      'exportar-el-historial-pedidos-y-facturas.md',
    );
  });

  it('falls back to a generic name when nothing is left', () => {
    expect(exportFileName('¿¡!?', 'md')).toBe('specification.md');
  });

  it('keeps names short', () => {
    expect(exportFileName('a'.repeat(200), 'md')).toHaveLength(63);
  });
});
