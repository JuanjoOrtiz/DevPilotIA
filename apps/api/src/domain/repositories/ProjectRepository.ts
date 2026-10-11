import type { Project, ProjectOverview } from '../entities/Project.js';

export interface ProjectData {
  name: string;
  description: string;
  techStack: string[];
  conventions: string;
}

/**
 * Todas las operaciones llevan el usuario en sesión: un proyecto de otra persona se
 * comporta exactamente igual que uno que no existe (RNF-06 y SEG-01).
 */
export interface ProjectRepository {
  listForUser(userId: string): Promise<ProjectOverview[]>;
  findForUser(userId: string, projectId: string): Promise<ProjectOverview | null>;
  create(userId: string, data: ProjectData): Promise<Project>;
  /** Devuelve `null` si el proyecto no existe o no es del usuario. */
  updateForUser(
    userId: string,
    projectId: string,
    changes: Partial<ProjectData>,
  ): Promise<ProjectOverview | null>;
  /** Borra el proyecto y sus generaciones. Devuelve `false` si no existe o no es del usuario. */
  deleteForUser(userId: string, projectId: string): Promise<boolean>;
}
