import {
  INPUT_EXCERPT_LENGTH,
  type GenerationDetail,
  type GenerationSummary as SummaryDto,
} from '@devpilot/shared';
import {
  currentSpecification,
  type Generation,
  type GenerationSummary,
} from '../../domain/entities/Generation.js';

/** El comienzo de un texto en una sola línea, con puntos suspensivos si se ha cortado. */
export function excerpt(text: string, maxLength = INPUT_EXCERPT_LENGTH): string {
  // Se cuenta por caracteres completos para no partir un emoji por la mitad.
  const characters = Array.from(text.replace(/\s+/g, ' ').trim());
  if (characters.length <= maxLength) return characters.join('');
  return `${characters.slice(0, maxLength).join('').trimEnd()}…`;
}

/** Una fila del historial. La entrada completa y la especificación van en el detalle. */
export function toGenerationSummaryDto(generation: GenerationSummary): SummaryDto {
  return {
    id: generation.id,
    type: generation.type,
    status: generation.status,
    title: generation.title,
    inputExcerpt: excerpt(generation.inputText),
    complexity: generation.complexity,
    isEdited: generation.editedAt !== null,
    isSample: generation.isSample,
    createdAt: generation.createdAt.toISOString(),
  };
}

/** Una generación completa, con la especificación vigente. */
export function toGenerationDetailDto(generation: Generation): GenerationDetail {
  return {
    id: generation.id,
    projectId: generation.projectId,
    type: generation.type,
    status: generation.status,
    inputText: generation.inputText,
    additionalContext: generation.additionalContext,
    errorCode: generation.status === 'failed' ? generation.errorCode : null,
    clarifyingQuestions: generation.clarifyingQuestions,
    clarificationAnswers: generation.clarificationAnswers,
    specification: currentSpecification(generation),
    title: generation.title,
    complexity: generation.complexity,
    isEdited: generation.editedAt !== null,
    isSample: generation.isSample,
    createdAt: generation.createdAt.toISOString(),
    completedAt: generation.completedAt?.toISOString() ?? null,
  };
}
