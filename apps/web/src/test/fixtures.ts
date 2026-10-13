import type {
  ClarifyingQuestion,
  GenerationDetail,
  GenerationPageResponse,
  GenerationSummary,
  Project,
  Specification,
} from '@devpilot/shared';

export const portal: Project = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Portal de clientes',
  description: 'Área privada donde los clientes consultan pedidos, facturas e incidencias.',
  techStack: ['React', 'Node.js', 'PostgreSQL'],
  conventions: 'Clean Architecture en el backend.\nTests con Vitest.',
  generationCount: 11,
  // A mediodía en UTC: la fecha es la misma en cualquier zona horaria de quien ejecute los tests.
  lastActivityAt: '2026-10-10T12:00:00.000Z',
  createdAt: '2026-10-01T12:00:00.000Z',
  updatedAt: '2026-10-02T12:00:00.000Z',
};

export const reservas: Project = {
  ...portal,
  id: '22222222-2222-4222-8222-222222222222',
  name: 'App de reservas',
  description: 'Reserva de pistas y clases para un club deportivo.',
  techStack: ['Angular', 'Spring Boot'],
  conventions: '',
  generationCount: 1,
  lastActivityAt: '2026-10-09T12:00:00.000Z',
};

let sequence = 0;

export function generation(overrides: Partial<GenerationSummary> = {}): GenerationSummary {
  sequence += 1;
  return {
    id: `33333333-3333-4333-8333-${String(sequence).padStart(12, '0')}`,
    type: 'feature',
    status: 'completed',
    title: 'Recuperación de contraseña con enlace por email',
    inputExcerpt: 'Quiero que el usuario pueda recuperar su contraseña',
    complexity: 'M',
    isEdited: false,
    isSample: false,
    createdAt: '2026-10-10T12:00:00.000Z',
    ...overrides,
  };
}

export function pageOf(
  items: GenerationSummary[],
  overrides: Partial<GenerationPageResponse> = {},
): GenerationPageResponse {
  return { items, page: 1, pageSize: 10, total: items.length, ...overrides };
}

export const specification: Specification = {
  schemaVersion: 1,
  title: 'Exportar el historial de pedidos a CSV',
  assumptions: ['Solo se exportan los pedidos del usuario en sesión'],
  technicalDescription: 'Nuevo endpoint que genera el CSV en streaming con Node.js.',
  userStories: [
    {
      asA: 'cliente',
      iWant: 'descargar mis pedidos en CSV',
      soThat: 'pueda analizarlos en una hoja de cálculo',
      acceptanceCriteria: ['El fichero incluye fecha, importe y estado'],
    },
  ],
  tasks: {
    frontend: [{ title: 'Botón de exportar', description: 'En la lista de pedidos, con React' }],
    backend: [],
  },
  risks: [{ description: 'Exportaciones grandes', severity: 'high', mitigation: 'Streaming' }],
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

export const questions: ClarifyingQuestion[] = [
  { id: 'q1', question: '¿Qué columnas debe tener el CSV?', why: 'Define el formato del fichero' },
  { id: 'q2', question: '¿Hay un máximo de pedidos?', why: 'Cambia cómo se genera el fichero' },
];

export function generationDetail(overrides: Partial<GenerationDetail> = {}): GenerationDetail {
  return {
    id: '44444444-4444-4444-8444-444444444444',
    projectId: portal.id,
    type: 'feature',
    status: 'completed',
    inputText: 'Quiero que los clientes exporten su historial de pedidos a CSV',
    additionalContext: null,
    errorCode: null,
    clarifyingQuestions: null,
    clarificationAnswers: null,
    specification,
    title: specification.title,
    complexity: 'M',
    isEdited: false,
    isSample: false,
    createdAt: '2026-10-12T12:00:00.000Z',
    completedAt: '2026-10-12T12:00:20.000Z',
    ...overrides,
  };
}
