import type { Project as ProjectDto } from '@devpilot/shared';
import { DomainError } from '../../domain/errors/DomainError.js';
import type { ProjectRepository } from '../../domain/repositories/ProjectRepository.js';
import { toProjectDto } from '../dto/ProjectDto.js';

/** El detalle de un proyecto del usuario (RF-PRO-03). */
export class GetProject {
  private readonly projects: ProjectRepository;

  constructor(projects: ProjectRepository) {
    this.projects = projects;
  }

  async execute(userId: string, projectId: string): Promise<ProjectDto> {
    const project = await this.projects.findForUser(userId, projectId);
    // SEG-01: un proyecto ajeno responde igual que uno que no existe.
    if (!project) throw new DomainError('NOT_FOUND', 'Project not found');

    return toProjectDto(project);
  }
}
