import { describe, expect, it } from 'vitest';
import {
  finalModelResponseSchema,
  firstModelResponseSchema,
  type Specification,
} from './specification.js';

const validSpecification: Specification = {
  schemaVersion: 1,
  title: 'Exportar el historial de pedidos a CSV',
  assumptions: ['La exportación incluye solo los pedidos del usuario en sesión'],
  technicalDescription: 'Nuevo endpoint que genera un CSV en streaming.',
  userStories: [
    {
      asA: 'cliente',
      iWant: 'descargar mis pedidos en CSV',
      soThat: 'pueda analizarlos en una hoja de cálculo',
      acceptanceCriteria: ['El fichero incluye fecha, importe y estado'],
    },
  ],
  tasks: {
    frontend: [{ title: 'Botón de exportar', description: 'En la lista de pedidos' }],
    backend: [{ title: 'Endpoint de exportación', description: 'GET /orders/export' }],
  },
  risks: [{ description: 'Exportaciones grandes', severity: 'medium', mitigation: 'Streaming' }],
  edgeCases: ['Usuario sin pedidos'],
  testCases: [
    {
      title: 'Exporta los pedidos',
      type: 'integration',
      steps: ['Crear dos pedidos', 'Pedir la exportación'],
      expectedResult: 'Un CSV con dos filas',
    },
  ],
  complexity: { size: 'M', rationale: 'Un endpoint y un botón' },
};

const questions = [
  { id: 'q1', question: '¿Qué columnas?', why: 'Define el formato del fichero' },
  { id: 'q2', question: '¿Hay un máximo de filas?', why: 'Cambia la estrategia de exportación' },
];

// RF-GEN-02, RF-GEN-05, RF-GEN-09 y RF-GEN-10
describe('model responses', () => {
  it('accepts either questions or a specification on the first call', () => {
    expect(firstModelResponseSchema.safeParse({ kind: 'questions', questions }).success).toBe(true);
    expect(
      firstModelResponseSchema.safeParse({
        kind: 'specification',
        specification: validSpecification,
      }).success,
    ).toBe(true);
  });

  it('asks between 2 and 4 questions with distinct ids', () => {
    const one = { kind: 'questions', questions: questions.slice(0, 1) };
    const repeated = { kind: 'questions', questions: [questions[0], questions[0]] };

    expect(firstModelResponseSchema.safeParse(one).success).toBe(false);
    expect(firstModelResponseSchema.safeParse(repeated).success).toBe(false);
  });

  it('only accepts a specification once the questions have been answered', () => {
    expect(finalModelResponseSchema.safeParse({ kind: 'questions', questions }).success).toBe(
      false,
    );
  });

  it('rejects a specification without user stories or with an unknown size', () => {
    const noStories = { ...validSpecification, userStories: [] };
    const badSize = { ...validSpecification, complexity: { size: 'XXL', rationale: 'x' } };

    for (const specification of [noStories, badSize]) {
      expect(
        finalModelResponseSchema.safeParse({ kind: 'specification', specification }).success,
      ).toBe(false);
    }
  });
});
