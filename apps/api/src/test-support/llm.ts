// Dobles del modelo y del trabajo en segundo plano para los tests. No se compilan.
import type { Specification } from '@devpilot/shared';
import type { LLMErrorCode } from '../domain/errors/LLMError.js';
import { LLMError } from '../domain/errors/LLMError.js';
import type { BackgroundTasks } from '../domain/providers/BackgroundTasks.js';
import type { LLMProvider, LLMRequest, LLMResult } from '../domain/providers/LLMProvider.js';

/** Lo que responde el modelo en una llamada: un texto o un fallo del proveedor. */
export type ScriptedReply = { text: string } | { error: LLMErrorCode };

/** Modelo con respuestas fijas, en orden. Guarda las peticiones para inspeccionarlas. */
export class ScriptedLLMProvider implements LLMProvider {
  readonly requests: LLMRequest[] = [];
  private readonly replies: ScriptedReply[];

  constructor(replies: ScriptedReply[] = []) {
    this.replies = [...replies];
  }

  reply(...replies: ScriptedReply[]): this {
    this.replies.push(...replies);
    return this;
  }

  generate(request: LLMRequest): Promise<LLMResult> {
    this.requests.push(request);
    const next = this.replies.shift();
    if (!next) return Promise.reject(new Error('No scripted reply left'));
    if ('error' in next) return Promise.reject(new LLMError(next.error, next.error));
    return Promise.resolve({
      text: next.text,
      model: 'scripted',
      inputTokens: 100,
      outputTokens: 50,
    });
  }
}

/** Ejecuta las tareas al momento y deja esperar a que terminen con `settle()`. */
export class InlineBackgroundTasks implements BackgroundTasks {
  private readonly pending: Promise<void>[] = [];

  run(task: () => Promise<void>): void {
    this.pending.push(task());
  }

  async settle(): Promise<void> {
    while (this.pending.length > 0) await this.pending.shift();
  }
}

export const sampleSpecification: Specification = {
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

export const sampleQuestions = [
  { id: 'q1', question: '¿Qué columnas debe tener el CSV?', why: 'Define el formato del fichero' },
  { id: 'q2', question: '¿Hay un máximo de pedidos?', why: 'Cambia cómo se genera el fichero' },
];

export const specificationReply = (specification: Specification = sampleSpecification) => ({
  text: JSON.stringify({ kind: 'specification', specification }),
});

export const questionsReply = () => ({
  text: JSON.stringify({ kind: 'questions', questions: sampleQuestions }),
});
