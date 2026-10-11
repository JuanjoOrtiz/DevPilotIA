import { DomainError } from '../../domain/errors/DomainError.js';
import type { ProjectRepository } from '../../domain/repositories/ProjectRepository.js';

/** Elimina un proyecto del usuario y, con él, todas sus generaciones (RF-PRO-05). */
export class DeleteProject {
  private readonly projects: ProjectRepository;

  constructor(projects: ProjectRepository) {
    this.projects = projects;
  }

  async execute(userId: string, projectId: string): Promise<void> {
    const deleted = await this.projects.deleteForUser(userId, projectId);
    if (!deleted) throw new DomainError('NOT_FOUND', 'Project not found');
  }
}
