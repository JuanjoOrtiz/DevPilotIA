import type { Clock } from '../../domain/providers/Clock.js';
import type { GenerationRepository } from '../../domain/repositories/GenerationRepository.js';
import type { ProjectRepository } from '../../domain/repositories/ProjectRepository.js';
import { SAMPLE_PROJECT, SAMPLE_REQUEST, SAMPLE_SPECIFICATION } from '../samples/sampleProject.js';

/**
 * RF-PRO-06: el proyecto de ejemplo de una cuenta nueva, con una generación completada y
 * marcada como de ejemplo. Sale de un fichero del repositorio: no llama al modelo ni
 * cuenta para los límites de uso.
 */
export class SampleProjectProvisioner {
  private readonly projects: ProjectRepository;
  private readonly generations: GenerationRepository;
  private readonly clock: Clock;

  constructor(projects: ProjectRepository, generations: GenerationRepository, clock: Clock) {
    this.projects = projects;
    this.generations = generations;
    this.clock = clock;
  }

  async provision(userId: string): Promise<void> {
    const project = await this.projects.create(userId, SAMPLE_PROJECT);
    await this.generations.createSample(project.id, {
      ...SAMPLE_REQUEST,
      additionalContext: null,
      language: 'es',
      specification: SAMPLE_SPECIFICATION,
      createdAt: this.clock.now(),
    });
  }
}
