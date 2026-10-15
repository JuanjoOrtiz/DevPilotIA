import type { CreateGenerationInput, GenerationDetail } from '@devpilot/shared';
import { DomainError } from '../../domain/errors/DomainError.js';
import type { BackgroundTasks } from '../../domain/providers/BackgroundTasks.js';
import type { Clock } from '../../domain/providers/Clock.js';
import type { SecurityLog } from '../../domain/providers/SecurityLog.js';
import type { GenerationRepository } from '../../domain/repositories/GenerationRepository.js';
import type { ProjectRepository } from '../../domain/repositories/ProjectRepository.js';
import { toGenerationDetailDto } from '../dto/GenerationDto.js';
import type { GenerationRunner } from '../services/GenerationRunner.js';

export interface DailyLimits {
  /** Generaciones por usuario y día (RF-GEN-07). */
  perUser: number;
  /** Generaciones de todos los usuarios al día: protege la cuota gratuita del modelo. */
  global: number;
}

export interface CreateGenerationDependencies {
  projects: ProjectRepository;
  generations: GenerationRepository;
  runner: GenerationRunner;
  background: BackgroundTasks;
  clock: Clock;
  limits: DailyLimits;
  /** SEG-09: alcanzar un límite diario queda registrado. */
  log?: SecurityLog;
}

/** El día de los límites empieza a las 00:00 UTC. */
export function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Lanza una generación (RF-GEN-01 a 04): valida el proyecto y los límites diarios, la crea
 * en `generating` y deja el trabajo con el modelo en segundo plano. La respuesta (202) no
 * espera al modelo; el frontend consulta el estado.
 */
export class CreateGeneration {
  private readonly deps: CreateGenerationDependencies;

  constructor(deps: CreateGenerationDependencies) {
    this.deps = deps;
  }

  async execute(
    userId: string,
    projectId: string,
    input: CreateGenerationInput,
  ): Promise<GenerationDetail> {
    const { projects, generations, runner, background, clock, limits } = this.deps;

    const project = await projects.findForUser(userId, projectId);
    if (!project) throw new DomainError('NOT_FOUND', 'Project not found');

    const dayStart = startOfUtcDay(clock.now());
    const resetsAt = new Date(dayStart.getTime() + DAY_MS).toISOString();

    if ((await generations.countForUserSince(userId, dayStart)) >= limits.perUser) {
      this.deps.log?.record({ type: 'limit_reached', userId, detail: 'generations:user' });
      throw new DomainError('USER_QUOTA_EXCEEDED', 'Daily generation limit reached', {
        limit: limits.perUser,
        resetsAt,
      });
    }
    if ((await generations.countAllSince(dayStart)) >= limits.global) {
      this.deps.log?.record({ type: 'limit_reached', userId, detail: 'generations:global' });
      throw new DomainError('GLOBAL_QUOTA_EXCEEDED', 'Daily service limit reached', {
        limit: limits.global,
        resetsAt,
      });
    }

    // El idioma se guarda: es el de la especificación y decide cuándo hay que traducirla.
    const generation = await generations.create(projectId, {
      type: input.type,
      inputText: input.inputText,
      additionalContext: input.additionalContext,
      language: input.language,
    });

    background.run(() =>
      runner.run(
        generation.id,
        {
          project,
          type: generation.type,
          inputText: generation.inputText,
          additionalContext: generation.additionalContext,
          language: input.language,
        },
        'questions-or-specification',
      ),
    );

    return toGenerationDetailDto(generation);
  }
}
