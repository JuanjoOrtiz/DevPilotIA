import type { CreateProjectRequest, Project as ProjectDto } from '@devpilot/shared';
import type { ProjectRepository } from '../../domain/repositories/ProjectRepository.js';
import { toProjectDto } from '../dto/ProjectDto.js';

/** Crea un proyecto del usuario en sesión (RF-PRO-01). La entrada llega ya validada. */
export class CreateProject {
  private readonly projects: ProjectRepository;

  constructor(projects: ProjectRepository) {
    this.projects = projects;
  }

  async execute(userId: string, input: CreateProjectRequest): Promise<ProjectDto> {
    const project = await this.projects.create(userId, {
      name: input.name,
      description: input.description,
      techStack: input.techStack,
      conventions: input.conventions,
    });

    return toProjectDto({ ...project, generationCount: 0, lastGenerationAt: null });
  }
}
