import type {
  ClarificationAnswer,
  ClarifyingQuestion,
  Complexity,
  ErrorCode,
  GenerationStatus,
  GenerationType,
  SpecLanguage,
  Specification,
} from '@devpilot/shared';

/** Lo que el historial necesita de una generación, sin la especificación. */
export interface GenerationSummary {
  id: string;
  projectId: string;
  type: GenerationType;
  status: GenerationStatus;
  /** Lo pone la IA: no existe mientras se genera ni si la generación falla. */
  title: string | null;
  inputText: string;
  complexity: Complexity | null;
  /** Cuándo guardó el usuario su versión editada, si lo ha hecho. */
  editedAt: Date | null;
  isSample: boolean;
  createdAt: Date;
}

/** Una generación completa. */
export interface Generation extends GenerationSummary {
  additionalContext: string | null;
  errorCode: ErrorCode | null;
  clarifyingQuestions: ClarifyingQuestion[] | null;
  clarificationAnswers: ClarificationAnswer[] | null;
  aiSpec: Specification | null;
  editedSpec: Specification | null;
  /** Idioma en que escribió el modelo. */
  language: SpecLanguage;
  /** Traducciones guardadas de la especificación vigente. */
  translations: SpecTranslations;
  /** Cuándo respondió el usuario a las preguntas: desde entonces vuelve a generarse. */
  answeredAt: Date | null;
  completedAt: Date | null;
}

/** Una traducción guardada y de qué versión de la especificación salió. */
export interface SpecTranslation {
  /** `ai` o la fecha de la edición traducida: si cambia, la traducción ya no vale. */
  source: string;
  specification: Specification;
}

export type SpecTranslations = Partial<Record<SpecLanguage, SpecTranslation>>;

/** Qué versión de la especificación es la vigente, para saber si una traducción sigue valiendo. */
export function specificationSource(generation: Pick<Generation, 'editedAt'>): string {
  return generation.editedAt?.toISOString() ?? 'ai';
}

/** La especificación vigente en un idioma: la original, una traducción vigente o nada. */
export function specificationIn(
  generation: Generation,
  language: SpecLanguage,
): Specification | null {
  if (language === generation.language) return currentSpecification(generation);
  const translation = generation.translations[language];
  return translation?.source === specificationSource(generation) ? translation.specification : null;
}

/** Lo que cuesta una o varias llamadas al modelo. Se acumula entre las dos fases. */
export interface GenerationUsage {
  model: string | null;
  attempts: number;
  durationMs: number;
  inputTokens: number;
  outputTokens: number;
}

/** Una generación en curso pasa a fallida si lleva más de esto sin terminar (docs/ai-contract.md). */
export const STALE_GENERATION_MS = 2 * 60 * 1000;

/** La especificación vigente: la editada si existe y, si no, la de la IA. */
export function currentSpecification(generation: Generation): Specification | null {
  return generation.editedSpec ?? generation.aiSpec;
}

/** Desde cuándo se está generando: la creación o, tras las preguntas, la respuesta. */
export function generatingSince(generation: Generation): Date {
  return generation.answeredAt ?? generation.createdAt;
}
