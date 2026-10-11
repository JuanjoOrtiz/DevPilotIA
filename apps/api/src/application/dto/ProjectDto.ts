import type { Project as ProjectDto } from '@devpilot/shared';
import { lastActivityAt, type ProjectOverview } from '../../domain/entities/Project.js';

/** El proyecto que sale de la API: sin el id de su dueño, que el frontend no necesita. */
export function toProjectDto(project: ProjectOverview): ProjectDto {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    techStack: project.techStack,
    conventions: project.conventions,
    generationCount: project.generationCount,
    lastActivityAt: lastActivityAt(project).toISOString(),
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
}
