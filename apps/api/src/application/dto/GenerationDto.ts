import { INPUT_EXCERPT_LENGTH, type GenerationSummary as SummaryDto } from '@devpilot/shared';
import type { GenerationSummary } from '../../domain/entities/Generation.js';

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
