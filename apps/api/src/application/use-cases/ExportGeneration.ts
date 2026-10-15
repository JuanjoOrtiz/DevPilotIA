import {
  SPEC_EXPORT_SCHEMA_URL,
  SPEC_EXPORT_VERSION,
  type ExportFormat,
  type SpecLanguage,
  type SpecificationExport,
} from '@devpilot/shared';
import { currentSpecification, specificationIn } from '../../domain/entities/Generation.js';
import { DomainError } from '../../domain/errors/DomainError.js';
import type { Clock } from '../../domain/providers/Clock.js';
import type { GenerationRepository } from '../../domain/repositories/GenerationRepository.js';
import type { ProjectRepository } from '../../domain/repositories/ProjectRepository.js';
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
 * Exporta la especificación vigente de una generación (RF-EXP-01 y 02): la editada si
 * existe y, si no, la de la IA; traducida al idioma pedido si esa traducción ya está
 * guardada. Una generación sin especificación todavía no se puede exportar.
 */
export class ExportGeneration {
  private readonly generations: GenerationRepository;
  private readonly projects: ProjectRepository;
  private readonly clock: Clock;

  constructor(generations: GenerationRepository, projects: ProjectRepository, clock: Clock) {
    this.generations = generations;
    this.projects = projects;
    this.clock = clock;
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
    const translated = specificationIn(generation, request.language);
    const specification = translated ?? current;
    const fileName = exportFileName(specification.title, request.format);

    // RF-EXP-02: un sobre con el contexto y, dentro, la especificación tal cual.
    if (request.format === 'json') {
      const project = await this.projects.findForUser(userId, generation.projectId);
      if (!project) throw new DomainError('NOT_FOUND', 'Generation not found');
      const file: SpecificationExport = {
        $schema: SPEC_EXPORT_SCHEMA_URL,
        exportVersion: SPEC_EXPORT_VERSION,
        exportedAt: this.clock.now().toISOString(),
        language: translated ? request.language : generation.language,
        project: { name: project.name },
        generation: {
          id: generation.id,
          type: generation.type,
          createdAt: generation.createdAt.toISOString(),
          completedAt: generation.completedAt?.toISOString() ?? null,
          edited: generation.editedSpec !== null,
          editedAt: generation.editedAt?.toISOString() ?? null,
        },
        specification,
      };
      return {
        fileName,
        contentType: 'application/json; charset=utf-8',
        content: `${JSON.stringify(file, null, 2)}\n`,
      };
    }
    return {
      fileName,
      contentType: 'text/markdown; charset=utf-8',
      content: specificationToMarkdown(specification, generation.type, request.language),
    };
  }
}
