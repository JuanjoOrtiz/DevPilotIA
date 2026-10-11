import type { GenerationPageResponse, PageQuery } from '@devpilot/shared';
import { DomainError } from '../../domain/errors/DomainError.js';
import type { GenerationRepository } from '../../domain/repositories/GenerationRepository.js';
import type { ProjectRepository } from '../../domain/repositories/ProjectRepository.js';
import { toGenerationSummaryDto } from '../dto/GenerationDto.js';

/** Una página del historial de un proyecto, de más reciente a más antigua (RF-HIS-01). */
export class ListProjectGenerations {
  private readonly projects: ProjectRepository;
  private readonly generations: GenerationRepository;

  constructor(projects: ProjectRepository, generations: GenerationRepository) {
    this.projects = projects;
    this.generations = generations;
  }

  async execute(
    userId: string,
    projectId: string,
    page: PageQuery,
  ): Promise<GenerationPageResponse> {
    // Distingue un proyecto sin generaciones de uno que no existe o es de otra persona.
    const project = await this.projects.findForUser(userId, projectId);
    if (!project) throw new DomainError('NOT_FOUND', 'Project not found');

    const { items, total } = await this.generations.pageForProject(userId, projectId, page);

    return {
      items: items.map(toGenerationSummaryDto),
      page: page.page,
      pageSize: page.pageSize,
      total,
    };
  }
}
