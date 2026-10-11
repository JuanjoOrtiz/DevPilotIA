import type { Project as ProjectDto, UpdateProjectRequest } from '@devpilot/shared';
import { DomainError } from '../../domain/errors/DomainError.js';
import type {
  ProjectData,
  ProjectRepository,
} from '../../domain/repositories/ProjectRepository.js';
import { toProjectDto } from '../dto/ProjectDto.js';

/** Cambia los campos indicados de un proyecto del usuario (RF-PRO-04). */
export class UpdateProject {
  private readonly projects: ProjectRepository;

  constructor(projects: ProjectRepository) {
    this.projects = projects;
  }

  async execute(
    userId: string,
    projectId: string,
    input: UpdateProjectRequest,
  ): Promise<ProjectDto> {
    const changes: Partial<ProjectData> = {};
    if (input.name !== undefined) changes.name = input.name;
    if (input.description !== undefined) changes.description = input.description;
    if (input.techStack !== undefined) changes.techStack = input.techStack;
    if (input.conventions !== undefined) changes.conventions = input.conventions;

    // Sin cambios no se toca el proyecto: su última actividad sigue siendo la que era.
    const project =
      Object.keys(changes).length > 0
        ? await this.projects.updateForUser(userId, projectId, changes)
        : await this.projects.findForUser(userId, projectId);
    if (!project) throw new DomainError('NOT_FOUND', 'Project not found');

    return toProjectDto(project);
  }
}
