import type { GenerationDetail, UpdateSpecificationRequest } from '@devpilot/shared';
import { DomainError } from '../../domain/errors/DomainError.js';
import type { Clock } from '../../domain/providers/Clock.js';
import type { GenerationRepository } from '../../domain/repositories/GenerationRepository.js';
import { toGenerationDetailDto } from '../dto/GenerationDto.js';

/**
 * RF-EDI-01 y 02: guarda la especificación editada. Llega ya validada con el mismo
 * esquema que la respuesta de la IA; la original se conserva y la generación queda
 * marcada como editada.
 */
export class UpdateSpecification {
  private readonly generations: GenerationRepository;
  private readonly clock: Clock;

  constructor(generations: GenerationRepository, clock: Clock) {
    this.generations = generations;
    this.clock = clock;
  }

  async execute(
    userId: string,
    generationId: string,
    request: UpdateSpecificationRequest,
  ): Promise<GenerationDetail> {
    const generation = await this.generations.findForUser(userId, generationId);
    if (!generation) throw new DomainError('NOT_FOUND', 'Generation not found');

    const saved = await this.generations.saveEdit(
      userId,
      generationId,
      request.specification,
      request.language,
      this.clock.now(),
    );
    if (!saved) {
      throw new DomainError('SPECIFICATION_NOT_READY', 'Only a completed generation can be edited');
    }

    const updated = await this.generations.findForUser(userId, generationId);
    if (!updated) throw new DomainError('NOT_FOUND', 'Generation not found');
    return toGenerationDetailDto(updated);
  }
}
