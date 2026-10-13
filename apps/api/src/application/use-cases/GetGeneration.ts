import type { GenerationDetail } from '@devpilot/shared';
import { generatingSince, STALE_GENERATION_MS } from '../../domain/entities/Generation.js';
import { DomainError } from '../../domain/errors/DomainError.js';
import type { Clock } from '../../domain/providers/Clock.js';
import type { GenerationRepository } from '../../domain/repositories/GenerationRepository.js';
import { toGenerationDetailDto } from '../dto/GenerationDto.js';

/**
 * Estado y especificación de una generación (RF-GEN-04 y RF-HIS-03). Una generación que
 * lleva más de 2 minutos en `generating` se da por fallida: su instancia se perdió.
 */
export class GetGeneration {
  private readonly generations: GenerationRepository;
  private readonly clock: Clock;

  constructor(generations: GenerationRepository, clock: Clock) {
    this.generations = generations;
    this.clock = clock;
  }

  async execute(userId: string, generationId: string): Promise<GenerationDetail> {
    let generation = await this.generations.findForUser(userId, generationId);
    if (!generation) throw new DomainError('NOT_FOUND', 'Generation not found');

    const staleBefore = new Date(this.clock.now().getTime() - STALE_GENERATION_MS);
    if (generation.status === 'generating' && generatingSince(generation) < staleBefore) {
      await this.generations.failIfStale(userId, generationId, staleBefore);
      generation = (await this.generations.findForUser(userId, generationId)) ?? generation;
    }

    return toGenerationDetailDto(generation);
  }
}
