import type { GenerationDetail } from '@devpilot/shared';
import { DomainError } from '../../domain/errors/DomainError.js';
import type { GenerationRepository } from '../../domain/repositories/GenerationRepository.js';
import { toGenerationDetailDto } from '../dto/GenerationDto.js';

/**
 * RF-EDI-03: vuelve a la especificación que escribió la IA y descarta la edición. Sobre
 * una generación sin editar no hace nada: pulsar dos veces da el mismo resultado.
 */
export class RestoreOriginalSpecification {
  private readonly generations: GenerationRepository;

  constructor(generations: GenerationRepository) {
    this.generations = generations;
  }

  async execute(userId: string, generationId: string): Promise<GenerationDetail> {
    const generation = await this.generations.findForUser(userId, generationId);
    if (!generation) throw new DomainError('NOT_FOUND', 'Generation not found');
    if (generation.status !== 'completed' || !generation.aiSpec) {
      throw new DomainError(
        'SPECIFICATION_NOT_READY',
        'Only a completed generation can be restored',
      );
    }
    if (!generation.editedAt) return toGenerationDetailDto(generation);

    await this.generations.restoreOriginal(userId, generationId);

    const restored = await this.generations.findForUser(userId, generationId);
    if (!restored) throw new DomainError('NOT_FOUND', 'Generation not found');
    return toGenerationDetailDto(restored);
  }
}
