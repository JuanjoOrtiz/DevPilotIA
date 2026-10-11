import type { Project as ProjectDto } from '@devpilot/shared';
import { lastActivityAt } from '../../domain/entities/Project.js';
import type { ProjectRepository } from '../../domain/repositories/ProjectRepository.js';
import { toProjectDto } from '../dto/ProjectDto.js';

/** Los proyectos del usuario, primero el de actividad más reciente (RF-PRO-02). */
export class ListProjects {
  private readonly projects: ProjectRepository;

  constructor(projects: ProjectRepository) {
    this.projects = projects;
  }

  async execute(userId: string): Promise<ProjectDto[]> {
    const projects = await this.projects.listForUser(userId);

    return projects
      .toSorted((a, b) => lastActivityAt(b).getTime() - lastActivityAt(a).getTime())
      .map(toProjectDto);
  }
}
