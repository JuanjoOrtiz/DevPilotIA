import type { GenerationPageResponse, GenerationSummary, Project } from '@devpilot/shared';

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
