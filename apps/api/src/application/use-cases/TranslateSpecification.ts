import { finalModelResponseSchema, type SpecLanguage, type Specification } from '@devpilot/shared';
import {
  currentSpecification,
  specificationIn,
  specificationSource,
} from '../../domain/entities/Generation.js';
import { DomainError } from '../../domain/errors/DomainError.js';
import { LLMError } from '../../domain/errors/LLMError.js';
import type { LLMProvider } from '../../domain/providers/LLMProvider.js';
import type { GenerationRepository } from '../../domain/repositories/GenerationRepository.js';
import { buildTranslationRequest, structureProblems } from '../services/TranslationPrompt.js';

export interface TranslateSpecificationDependencies {
  generations: GenerationRepository;
  llm: LLMProvider;
  /** Tiempo máximo de cada llamada (20 s). */
  attemptMs: number;
}

export interface TranslatedSpecification {
  language: SpecLanguage;
  specification: Specification;
}

/**
 * La especificación vigente en el idioma de la interfaz. Se traduce con el modelo la
 * primera vez y se guarda: las siguientes veces, y la exportación, usan la guardada.
 * Una edición posterior la invalida. No cuenta para los límites diarios: como mucho hay
 * una traducción por generación, idioma y edición.
 */
export class TranslateSpecification {
  private readonly deps: TranslateSpecificationDependencies;

  constructor(deps: TranslateSpecificationDependencies) {
    this.deps = deps;
  }

  async execute(
    userId: string,
    generationId: string,
    language: SpecLanguage,
  ): Promise<TranslatedSpecification> {
    const { generations } = this.deps;
    const generation = await generations.findForUser(userId, generationId);
    if (!generation) throw new DomainError('NOT_FOUND', 'Generation not found');

    const original = currentSpecification(generation);
    if (generation.status !== 'completed' || !original) {
      throw new DomainError('SPECIFICATION_NOT_READY', 'The generation has no specification yet');
    }

    const stored = specificationIn(generation, language);
    if (stored) return { language, specification: stored };

    const specification = await this.translate(original, language);
    await generations.saveTranslation(userId, generationId, language, {
      source: specificationSource(generation),
      specification,
    });
    return { language, specification };
  }

  private async translate(original: Specification, language: SpecLanguage): Promise<Specification> {
    let feedback: string | undefined;
    let unavailable = 0;
    let invalid = 0;

    // Como en la generación: un reintento si el proveedor está caído y otro si la
    // respuesta no vale. Nada de esperas tras un 429: quien espera es una persona.
    for (;;) {
      let text: string;
      try {
        const result = await this.deps.llm.generate(
          buildTranslationRequest(original, language, { timeoutMs: this.deps.attemptMs, feedback }),
        );
        text = result.text;
      } catch (error) {
        if (!(error instanceof LLMError)) throw error;
        if (error.code === 'LLM_UNAVAILABLE' && unavailable === 0) {
          unavailable += 1;
          continue;
        }
        throw new DomainError(error.code, 'The specification could not be translated');
      }

      const problems = validate(text, original);
      if (problems.length === 0) {
        return finalModelResponseSchema.parse(JSON.parse(text)).specification;
      }
      invalid += 1;
      if (invalid > 1)
        throw new DomainError('LLM_INVALID_RESPONSE', 'The translation is not valid');
      feedback = problems.join('\n');
    }
  }
}

/** La respuesta tiene que ser una especificación válida con la misma estructura que la original. */
function validate(text: string, original: Specification): string[] {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return ['- The answer is not valid JSON.'];
  }
  const parsed = finalModelResponseSchema.safeParse(json);
  if (!parsed.success) {
    return parsed.error.issues
      .slice(0, 10)
      .map((issue) => `- ${issue.path.join('.') || '(root)'}: ${issue.message}`);
  }
  return structureProblems(original, parsed.data.specification);
}
