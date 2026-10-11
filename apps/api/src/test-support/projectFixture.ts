import { CreateProject } from '../application/use-cases/CreateProject.js';
import { DeleteProject } from '../application/use-cases/DeleteProject.js';
import { GetProject } from '../application/use-cases/GetProject.js';
import { ListProjectGenerations } from '../application/use-cases/ListProjectGenerations.js';
import { ListProjects } from '../application/use-cases/ListProjects.js';
import { UpdateProject } from '../application/use-cases/UpdateProject.js';
import { FixedClock, InMemoryGenerationRepository, InMemoryProjectRepository } from './fakes.js';

/** Los casos de uso de proyectos e historial montados sobre dobles en memoria. */
export function createProjectFixture(clock = new FixedClock()) {
  const generations = new InMemoryGenerationRepository(clock);
  const repository = new InMemoryProjectRepository(clock, generations);

  return {
    clock,
    repository,
    generations,
    listProjects: new ListProjects(repository),
    createProject: new CreateProject(repository),
    getProject: new GetProject(repository),
    updateProject: new UpdateProject(repository),
    deleteProject: new DeleteProject(repository),
    listProjectGenerations: new ListProjectGenerations(repository, generations),
  };
}

export const portal = {
  name: 'Portal de clientes',
  description: 'Área privada donde los clientes consultan sus pedidos',
  techStack: ['React', 'Node.js', 'PostgreSQL'],
  conventions: 'Clean Architecture en el backend. Tests con Vitest.',
};
