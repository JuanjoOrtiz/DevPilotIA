import type { ExportFormat, SpecLanguage } from '@devpilot/shared';
import { currentSpecification, specificationIn } from '../../domain/entities/Generation.js';
import { DomainError } from '../../domain/errors/DomainError.js';
import type { GenerationRepository } from '../../domain/repositories/GenerationRepository.js';
import { exportFileName, specificationToMarkdown } from '../services/SpecificationMarkdown.js';

export interface ExportRequest {
  format: ExportFormat;
  language: SpecLanguage;
}

/** Un fichero listo para descargar. */
export interface ExportedFile {
  fileName: string;
  contentType: string;
  content: string;
}

/**
 * Exporta la especificación vigente de una generación (RF-EXP-01): la editada si existe y,
 * si no, la de la IA; traducida al idioma pedido si esa traducción ya está guardada. Una
 * generación sin especificación todavía no se puede exportar.
 */
export class ExportGeneration {
  private readonly generations: GenerationRepository;

  constructor(generations: GenerationRepository) {
    this.generations = generations;
  }

  async execute(
    userId: string,
    generationId: string,
    request: ExportRequest,
  ): Promise<ExportedFile> {
    const generation = await this.generations.findForUser(userId, generationId);
    if (!generation) throw new DomainError('NOT_FOUND', 'Generation not found');

    const current = currentSpecification(generation);
    if (generation.status !== 'completed' || !current) {
      throw new DomainError('SPECIFICATION_NOT_READY', 'The generation has no specification yet');
    }

    // En el idioma pedido si ya está traducida (RF-EXP-04: siempre la versión vigente).
    const specification = specificationIn(generation, request.language) ?? current;
    return {
      fileName: exportFileName(specification.title, request.format),
      contentType: 'text/markdown; charset=utf-8',
      content: specificationToMarkdown(specification, generation.type, request.language),
    };
  }
}
