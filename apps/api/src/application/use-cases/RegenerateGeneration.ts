import type { GenerationDetail, SpecLanguage } from '@devpilot/shared';
import { DomainError } from '../../domain/errors/DomainError.js';
import type { GenerationRepository } from '../../domain/repositories/GenerationRepository.js';
import type { CreateGeneration } from './CreateGeneration.js';

/**
 * RF-GEN-06: una generación nueva con la misma entrada que otra, que se conserva. Pasa por
 * CreateGeneration, así que cuenta para los límites diarios como cualquier otra.
 */
export class RegenerateGeneration {
  private readonly generations: GenerationRepository;
  private readonly createGeneration: CreateGeneration;

  constructor(generations: GenerationRepository, createGeneration: CreateGeneration) {
    this.generations = generations;
    this.createGeneration = createGeneration;
  }

  async execute(
    userId: string,
    generationId: string,
    language: SpecLanguage,
  ): Promise<GenerationDetail> {
    const source = await this.generations.findForUser(userId, generationId);
    if (!source) throw new DomainError('NOT_FOUND', 'Generation not found');

    return this.createGeneration.execute(userId, source.projectId, {
      type: source.type,
      inputText: source.inputText,
      additionalContext: source.additionalContext,
      language,
    });
  }
}
