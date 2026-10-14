import { DomainError } from '../../domain/errors/DomainError.js';
import type { GenerationRepository } from '../../domain/repositories/GenerationRepository.js';

/** RF-HIS-04: elimina una generación del usuario. La confirmación la pide la interfaz. */
export class DeleteGeneration {
  private readonly generations: GenerationRepository;

  constructor(generations: GenerationRepository) {
    this.generations = generations;
  }

  async execute(userId: string, generationId: string): Promise<void> {
    const deleted = await this.generations.deleteForUser(userId, generationId);
    if (!deleted) throw new DomainError('NOT_FOUND', 'Generation not found');
  }
}
